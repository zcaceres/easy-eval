import { loadConfig, resolveWorker } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { loadGolden, loadRun, loadLatestRun } from "../storage/index";

export async function cmdMerge(
  datasetId: string,
  timestamp: string | undefined,
  opts: { worker?: string },
): Promise<void> {
  const config = await loadConfig();
  const { name: workerName } = resolveWorker(config, opts.worker);
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

  console.log(`Merge: ${datasetId} (worker: ${workerName})`);
  console.log(`  Golden: blessed ${golden.blessedAt.slice(0, 10)}`);
  console.log(`  Eval:   ${run.timestamp.slice(0, 19)}`);

  // TODO: Implement interactive merge
  console.log("\n[interactive merge not yet implemented — coming soon]");
  console.log("For now, use `ee bless` to promote the eval run directly.");
}
