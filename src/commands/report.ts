import { loadConfig, resolveEval } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { loadRun, loadLatestRun, loadGolden } from "../storage/index";
import { diff } from "../diff/index";
import { renderDiffTable, renderDetailedDiff } from "../render/table";
import { bold, dim, cyan } from "../render/colors";

export async function cmdReport(
  datasetId: string,
  timestamp: string | undefined,
  opts: { worker?: string; format?: string; against?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const { name: evalName, evalDef } = resolveEval(config, opts.worker);
  const storageRoot = getStorageRoot(config);

  const run = timestamp
    ? await loadRun(storageRoot, evalName, datasetId, timestamp)
    : await loadLatestRun(storageRoot, evalName, datasetId);

  if (!run) {
    const msg = timestamp
      ? `No eval run for ${datasetId} at ${timestamp}`
      : `No eval runs for ${datasetId}`;
    console.error(msg);
    process.exit(1);
  }

  const isJson = opts.format === "json";

  if (opts.against) {
    const baseRun = await loadRun(storageRoot, evalName, datasetId, opts.against);
    if (!baseRun) {
      console.error(`No eval run for ${datasetId} at ${opts.against}`);
      process.exit(1);
    }
    const result = diff(baseRun.output, run.output, evalDef.diffSchema);

    if (isJson) {
      console.log(JSON.stringify({
        run: {
          timestamp: run.timestamp,
          worker: run.worker,
          durationMs: run.durationMs,
          cost: run.cost,
          metadata: run.metadata,
        },
        against: {
          timestamp: baseRun.timestamp,
          worker: baseRun.worker,
          durationMs: baseRun.durationMs,
          cost: baseRun.cost,
          metadata: baseRun.metadata,
        },
        diff: result,
      }, null, 2));
      return;
    }

    console.log(bold(`Eval run: ${run.timestamp.slice(0, 19)}`) + dim(` (worker: ${run.worker})`));
    console.log(dim(`  Duration: ${(run.durationMs / 1000).toFixed(1)}s`));
    if (run.cost) console.log(dim(`  Cost: $${run.cost.total.toFixed(4)}`));
    console.log();
    console.log(`${dim("Against run:")} ${baseRun.timestamp.slice(0, 19)}`);
    console.log(dim(`  Duration: ${(baseRun.durationMs / 1000).toFixed(1)}s`));
    if (baseRun.cost) console.log(dim(`  Cost: $${baseRun.cost.total.toFixed(4)}`));
    console.log();
    console.log(renderDiffTable(result));
    console.log();
    console.log(renderDetailedDiff(result));
    return;
  }

  const golden = await loadGolden(storageRoot, evalName, datasetId);
  const result = golden ? diff(golden.output, run.output, evalDef.diffSchema) : null;

  if (isJson) {
    console.log(JSON.stringify({
      run: {
        timestamp: run.timestamp,
        worker: run.worker,
        durationMs: run.durationMs,
        cost: run.cost,
        metadata: run.metadata,
      },
      golden: golden ? { blessedAt: golden.blessedAt } : null,
      diff: result,
    }, null, 2));
    return;
  }

  console.log(bold(`Eval run: ${run.timestamp.slice(0, 19)}`) + dim(` (worker: ${run.worker})`));
  console.log(dim(`  Duration: ${(run.durationMs / 1000).toFixed(1)}s`));
  if (run.cost) {
    console.log(dim(`  Cost: $${run.cost.total.toFixed(4)}`));
    if (run.cost.breakdown) {
      for (const [model, data] of Object.entries(run.cost.breakdown)) {
        console.log(dim(`    ${model}: $${data.cost.toFixed(4)}`));
      }
    }
  }
  if (run.metadata && Object.keys(run.metadata).length > 0) {
    for (const [key, value] of Object.entries(run.metadata)) {
      console.log(dim(`  ${key}: ${JSON.stringify(value)}`));
    }
  }
  console.log();

  if (!golden) {
    console.log("No golden to compare against.\n");
    console.log("Output:");
    console.log(JSON.stringify(run.output, null, 2));
    return;
  }

  console.log(`${dim("Golden:")} blessed ${golden.blessedAt.slice(0, 10)}`);
  console.log();
  console.log(renderDiffTable(result!));
  console.log();
  console.log(renderDetailedDiff(result!));
}
