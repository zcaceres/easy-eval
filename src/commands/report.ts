import { loadConfig, resolveEval } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { loadRun, loadLatestRun, loadGolden } from "../storage/index";
import { diff } from "../diff/index";
import { renderDiffTable, renderDetailedDiff } from "../render/table";
import { bold, dim, cyan } from "../render/colors";

export async function cmdReport(
  datasetId: string,
  timestamp: string | undefined,
  opts: { worker?: string; format?: string; config?: string },
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

  const golden = await loadGolden(storageRoot, evalName, datasetId);
  if (!golden) {
    console.log("No golden to compare against.\n");
    console.log("Output:");
    console.log(JSON.stringify(run.output, null, 2));
    return;
  }

  console.log(`${dim("Golden:")} blessed ${golden.blessedAt.slice(0, 10)}`);

  const result = diff(golden.output, run.output, evalDef.diffSchema);
  console.log();
  console.log(renderDiffTable(result));
  console.log();
  console.log(renderDetailedDiff(result));
}
