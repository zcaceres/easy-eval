import { createInterface } from "readline";
import { loadConfig, resolveEval } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { saveRun, loadGolden, saveChange, discoverDatasets } from "../storage/index";
import type { DatasetInfo } from "../storage/index";
import { renderDiffTable, renderDetailedDiff, renderOutputTable, renderSweepTable } from "../render/table";
import { bold, dim, green, red, yellow } from "../render/colors";
import { validateEvalDef, validateOutput } from "../validation";
import { vibecheck } from "../judges/vibecheck";
import type { EvalContext, EvalRun, CostReport, Change, EvalVerdict, EvalDef, SweepDatasetResult } from "../types";

export async function cmdEval(
  datasetId: string,
  opts: { worker?: string; var?: Record<string, string>; diff?: boolean; format?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const { name: evalName, evalDef } = resolveEval(config, opts.worker);

  const configIssues = validateEvalDef(evalDef);
  const errors = configIssues.filter((i) => i.level === "error");
  if (errors.length > 0) {
    console.error(red("Config validation failed:"));
    for (const issue of errors) {
      console.error(red("  " + issue.message));
    }
    console.error(dim("\nRun `ee validate` for full details."));
    process.exit(1);
  }

  const storageRoot = getStorageRoot(config);
  const isJson = opts.format === "json";

  if (!isJson) {
    console.log(bold(`Running eval: ${datasetId}`) + dim(` (${evalName})`));
  }

  const vars = opts.var ?? {};

  let inputs: unknown = undefined;
  if (evalDef.inputs) {
    inputs = await evalDef.inputs(datasetId, vars);
  }

  let cost: CostReport | undefined;
  const metadata: Record<string, unknown> = {};

  const ctx: EvalContext = {
    datasetId,
    inputs,
    vars,
    reportCost: (c) => { cost = c; },
    reportMeta: (key, value) => { metadata[key] = value; },
  };

  const start = Date.now();
  const output = await evalDef.eval(ctx);
  const durationMs = Date.now() - start;

  if (evalDef.diffSchema) {
    const outputIssues = validateOutput(output, evalDef.diffSchema);
    const outputErrors = outputIssues.filter((i) => i.level === "error");
    if (outputErrors.length > 0) {
      console.error(red("\nOutput does not match schema:"));
      for (const issue of outputErrors) {
        console.error(red("  " + issue.message));
      }
      const warnings = outputIssues.filter((i) => i.level === "warn");
      for (const issue of warnings) {
        console.error(yellow("  " + issue.message));
      }
      console.error(dim("\nThe eval function returned data that doesn't match your configured schema."));
      console.error(dim("Check that your eval() output shape matches the paths in schema.sections."));
      process.exit(1);
    }
  }

  const run: EvalRun = {
    timestamp: new Date().toISOString(),
    datasetId,
    worker: evalName,
    durationMs,
    cost,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    vars: Object.keys(vars).length > 0 ? vars : undefined,
    inputs,
    output,
  };

  await saveRun(storageRoot, evalName, datasetId, run);

  if (!isJson) {
    console.log(dim(`  Duration: ${(durationMs / 1000).toFixed(1)}s`));
    if (cost) {
      console.log(dim(`  Cost: $${cost.total.toFixed(4)}`));
    }
    console.log(dim(`  Run saved: .ee/${evalName}/${datasetId}/runs/`));
  }

  if (opts.diff === false) {
    if (isJson) {
      console.log(JSON.stringify({ run, verdict: null, golden: null }, null, 2));
    } else {
      console.log(yellow("\nSkipping diff (--no-diff)."));
    }
    return;
  }

  const golden = await loadGolden(storageRoot, evalName, datasetId);
  const judge = evalDef.judge ?? vibecheck();
  const verdict = await judge({ run, golden, evalDef });

  if (!golden) {
    if (isJson) {
      console.log(JSON.stringify({ run, verdict, golden: null }, null, 2));
    } else {
      console.log(yellow("\nNo golden to compare against."));
      console.log(dim("Run `ee bless " + datasetId + "` to promote this output to golden.\n"));
      if (evalDef.diffSchema) {
        console.log(renderOutputTable(output, evalDef.diffSchema));
      } else {
        console.log(JSON.stringify(output, null, 2));
      }
    }
    return;
  }

  if (isJson) {
    console.log(JSON.stringify({
      run,
      verdict,
      golden: { blessedAt: golden.blessedAt },
    }, null, 2));
    return;
  }

  console.log(`\n${dim("Golden:")} blessed ${golden.blessedAt.slice(0, 10)}`);

  if (verdict.diff) {
    console.log();
    console.log(renderDiffTable(verdict.diff));
    console.log();
    console.log(renderDetailedDiff(verdict.diff));
  } else {
    console.log();
    console.log(verdict.summary);
  }

  await promptCodify(storageRoot, evalName, datasetId, run, inputs, vars, verdict, evalDef);
}

async function promptCodify(
  storageRoot: string,
  worker: string,
  datasetId: string,
  run: EvalRun,
  inputs: unknown,
  vars: Record<string, string>,
  verdict: EvalVerdict,
  evalDef: EvalDef,
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => {
    rl.question(q, (a) => resolve(a.trim().toLowerCase()));
  });

  try {
    const answer = await ask(`\nCodify this change? [y/N] `);
    if (answer !== "y" && answer !== "yes") return;

    const allDatasets = await discoverDatasets(storageRoot);
    const otherGoldens = allDatasets.filter(
      (ds) => ds.worker === worker && ds.hasGolden && ds.datasetId !== datasetId,
    );

    if (otherGoldens.length > 0) {
      const sweepAnswer = await ask(
        `\n${otherGoldens.length} other golden dataset${otherGoldens.length !== 1 ? "s" : ""} exist. ` +
        `Run regression check? ${dim(`(runs ${otherGoldens.length} eval${otherGoldens.length !== 1 ? "s" : ""})`)} [y/N] `,
      );

      if (sweepAnswer === "y" || sweepAnswer === "yes") {
        console.log();
        const sweepResults = await runRegressionSweep(otherGoldens, evalDef, storageRoot, worker, vars);

        console.log();
        console.log(bold("Regression sweep results:"));
        console.log(renderSweepTable(sweepResults));

        const inspectable = sweepResults.filter((r) => r.diff);
        if (inspectable.length > 0) {
          while (true) {
            const input = await new Promise<string>((resolve) => {
              rl.question(`\nInspect dataset ${dim("[name / Enter to skip]")}: `, (a) => resolve(a.trim()));
            });
            if (input === "") break;
            const match = inspectable.find((r) => r.datasetId === input);
            if (!match) {
              console.log(yellow(`No results for "${input}". Available: ${inspectable.map((r) => r.datasetId).join(", ")}`));
              continue;
            }
            console.log();
            console.log(renderDiffTable(match.diff!));
            console.log();
            console.log(renderDetailedDiff(match.diff!));
          }
        }

        const regressionCount = sweepResults.filter((r) => r.status === "regression").length;
        if (regressionCount > 0) {
          const proceed = await ask(
            `\n${red(`${regressionCount} regression${regressionCount !== 1 ? "s" : ""} detected.`)} Still codify? [y/N] `,
          );
          if (proceed !== "y" && proceed !== "yes") {
            console.log(yellow("Aborted. Change was not saved."));
            return;
          }
        } else {
          console.log(green("\nNo regressions detected."));
        }
      }
    }

    const note = await new Promise<string>((resolve) => {
      rl.question(`Note (optional): `, (a) => resolve(a.trim()));
    });

    const change: Change = {
      timestamp: new Date().toISOString(),
      datasetId,
      worker,
      runTimestamp: run.timestamp,
      inputs,
      vars,
      diff: verdict.diff ?? undefined,
      note: note || undefined,
      metadata: run.metadata,
    };

    await saveChange(storageRoot, change);
    console.log(green("✓ Change saved") + dim(` to .ee/changes/`));
  } finally {
    rl.close();
  }
}

async function runRegressionSweep(
  datasets: DatasetInfo[],
  evalDef: EvalDef,
  storageRoot: string,
  worker: string,
  vars: Record<string, string>,
): Promise<SweepDatasetResult[]> {
  const results: SweepDatasetResult[] = [];

  for (let i = 0; i < datasets.length; i++) {
    const ds = datasets[i]!;
    const progress = dim(`[${i + 1}/${datasets.length}]`);
    process.stdout.write(`  ${progress} ${ds.datasetId}...`);

    try {
      let inputs: unknown = undefined;
      if (evalDef.inputs) {
        inputs = await evalDef.inputs(ds.datasetId, vars);
      }

      let cost: CostReport | undefined;
      const metadata: Record<string, unknown> = {};
      const ctx: EvalContext = {
        datasetId: ds.datasetId,
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
        datasetId: ds.datasetId,
        worker,
        durationMs,
        cost,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        vars: Object.keys(vars).length > 0 ? vars : undefined,
        inputs,
        output,
      };
      await saveRun(storageRoot, worker, ds.datasetId, run);

      const golden = await loadGolden(storageRoot, worker, ds.datasetId);
      if (!golden) {
        console.log(yellow(" skipped (no golden)"));
        results.push({ datasetId: ds.datasetId, status: "skipped" });
        continue;
      }

      const judge = evalDef.judge ?? vibecheck();
      const verdict = await judge({ run, golden, evalDef });
      const status = verdict.pass ? "clean" : "regression";
      console.log(
        (verdict.pass ? green(" clean") : red(" regression")) + dim(` (${(durationMs / 1000).toFixed(1)}s)`),
      );

      results.push({ datasetId: ds.datasetId, status, diff: verdict.diff ?? undefined, durationMs, cost });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(yellow(` skipped (${message})`));
      results.push({ datasetId: ds.datasetId, status: "skipped", error: message });
    }
  }

  return results;
}
