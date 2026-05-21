import { loadConfig, resolveWorker } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { loadGolden, loadRun, loadLatestRun, saveGolden } from "../storage/index";
import { diff } from "../diff/index";
import { renderDiffTable } from "../render/table";
import { interactiveMerge } from "../merge/interactive";
import { bold, dim, green, cyan, magenta } from "../render/colors";
import type { Golden } from "../types";

export async function cmdMerge(
  datasetId: string,
  timestamp: string | undefined,
  opts: { worker?: string },
): Promise<void> {
  const config = await loadConfig();
  const { name: workerName, worker } = resolveWorker(config, opts.worker);
  const storageRoot = getStorageRoot(config);

  const golden = await loadGolden(storageRoot, workerName, datasetId);
  if (!golden) {
    console.error(`No golden for ${datasetId}. Run \`ee bless\` first.`);
    process.exit(1);
  }

  const run = timestamp
    ? await loadRun(storageRoot, workerName, datasetId, timestamp)
    : await loadLatestRun(storageRoot, workerName, datasetId);

  if (!run) {
    const msg = timestamp
      ? `No eval run for ${datasetId} at ${timestamp}`
      : `No eval runs for ${datasetId}`;
    console.error(msg);
    process.exit(1);
  }

  console.log(bold(`Merge: ${datasetId}`) + dim(` (worker: ${workerName})`));
  console.log(`  ${cyan("Golden:")} blessed ${golden.blessedAt.slice(0, 10)}`);
  console.log(`  ${magenta("Eval:")}   ${run.timestamp.slice(0, 19)}`);

  const result = diff(golden.output, run.output, worker.schema);
  console.log();
  console.log(renderDiffTable(result));

  const merged = await interactiveMerge(golden.output, run.output, worker.schema);

  const newGolden: Golden = {
    blessedAt: new Date().toISOString(),
    datasetId,
    worker: workerName,
    output: merged,
    metadata: run.metadata,
  };

  await saveGolden(storageRoot, workerName, datasetId, newGolden);
  console.log(green(`\nNew golden saved for ${datasetId}`));
}
