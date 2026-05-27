import { loadConfig, resolveEval } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { saveRun, loadGolden, discoverDatasets } from "../storage/index";
import { renderSweepTable, renderDiffTable, renderDetailedDiff } from "../render/table";
import { bold, dim, green, red, yellow } from "../render/colors";
import { vibecheck } from "../judges/vibecheck";
import type { EvalContext, EvalRun, CostReport, EvalDef, SweepDatasetResult } from "../types";

export async function cmdSweep(
  datasetId: string,
  opts: { worker?: string; var?: Record<string, string>; format?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const { name: evalName, evalDef } = resolveEval(config, opts.worker);
  const storageRoot = getStorageRoot(config);
  const isJson = opts.format === "json";
  const vars = opts.var ?? {};

  const allDatasets = await discoverDatasets(storageRoot);
  const otherGoldens = allDatasets.filter(
    (ds) => ds.worker === evalName && ds.hasGolden && ds.datasetId !== datasetId,
  );

  if (otherGoldens.length === 0) {
    if (isJson) {
      console.log(JSON.stringify({ baseDatasetId: datasetId, vars, results: [], summary: { total: 0, clean: 0, regression: 0, skipped: 0, error: 0 } }, null, 2));
    } else {
      console.log(yellow("No other golden datasets found for this worker."));
    }
    return;
  }

  if (!isJson) {
    console.log(bold(`Regression sweep from: ${datasetId}`) + dim(` (${evalName})`));
    console.log(dim(`  Running ${otherGoldens.length} dataset${otherGoldens.length !== 1 ? "s" : ""} with vars: ${Object.keys(vars).length > 0 ? JSON.stringify(vars) : "(none)"}`));
    console.log();
  }

  const results = await runSweep(otherGoldens.map((ds) => ds.datasetId), evalDef, storageRoot, evalName, vars, isJson);

  const summary = {
    total: results.length,
    clean: results.filter((r) => r.status === "clean").length,
    regression: results.filter((r) => r.status === "regression").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    error: results.filter((r) => r.status === "error").length,
  };

  if (isJson) {
    console.log(JSON.stringify({ baseDatasetId: datasetId, vars, results, summary }, null, 2));
    return;
  }

  console.log();
  console.log(bold("Results:"));
  console.log(renderSweepTable(results));

  if (summary.regression > 0) {
    console.log();
    console.log(red(`${summary.regression} regression${summary.regression !== 1 ? "s" : ""} detected.`));
    console.log(dim("Use ee report <datasetId> -f json to inspect individual datasets."));
  } else if (summary.clean > 0) {
    console.log();
    console.log(green("No regressions detected."));
  }
}

async function runSweep(
  datasetIds: string[],
  evalDef: EvalDef,
  storageRoot: string,
  worker: string,
  vars: Record<string, string>,
  silent: boolean,
): Promise<SweepDatasetResult[]> {
  const results: SweepDatasetResult[] = [];

  for (let i = 0; i < datasetIds.length; i++) {
    const dsId = datasetIds[i]!;
    if (!silent) {
      const progress = dim(`[${i + 1}/${datasetIds.length}]`);
      process.stdout.write(`  ${progress} ${dsId}...`);
    }

    try {
      let inputs: unknown = undefined;
      if (evalDef.inputs) {
        inputs = await evalDef.inputs(dsId, vars);
      }

      let cost: CostReport | undefined;
      const metadata: Record<string, unknown> = {};
      const ctx: EvalContext = {
        datasetId: dsId,
        inputs,
        vars,
        reportCost: (c) => { cost = c; },
        reportMeta: (key, value) => { metadata[key] = value; },
      };

      const start = Date.now();
      const output = await evalDef.eval(ctx);
      const durationMs = Date.now() - start;

      const run: EvalRun = {
        timestamp: new Date().toISOString(),
        datasetId: dsId,
        worker,
        durationMs,
        cost,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        vars: Object.keys(vars).length > 0 ? vars : undefined,
        inputs,
        output,
      };
      await saveRun(storageRoot, worker, dsId, run);

      const golden = await loadGolden(storageRoot, worker, dsId);
      if (!golden) {
        if (!silent) console.log(yellow(" skipped (no golden)"));
        results.push({ datasetId: dsId, status: "skipped" });
        continue;
      }

      const judge = evalDef.judge ?? vibecheck();
      const verdict = await judge({ run, golden, evalDef });
      const status = verdict.pass ? "clean" : "regression";

      if (!silent) {
        console.log(
          (verdict.pass ? green(" clean") : red(" regression")) + dim(` (${(durationMs / 1000).toFixed(1)}s)`),
        );
      }

      results.push({ datasetId: dsId, status, diff: verdict.diff ?? undefined, durationMs, cost });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!silent) console.log(yellow(` error (${message})`));
      results.push({ datasetId: dsId, status: "error", error: message });
    }
  }

  return results;
}
