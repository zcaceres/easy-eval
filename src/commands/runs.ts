import { loadConfig, resolveWorker } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { listRuns, loadGolden } from "../storage/index";

export async function cmdRuns(
  datasetId: string,
  opts: { worker?: string; limit?: string },
): Promise<void> {
  const config = await loadConfig();
  const { name: workerName } = resolveWorker(config, opts.worker);
  const storageRoot = getStorageRoot(config);
  const limit = opts.limit ? parseInt(opts.limit, 10) : 20;

  const runs = await listRuns(storageRoot, workerName, datasetId);
  if (runs.length === 0) {
    console.log(`No eval runs for ${datasetId} (worker: ${workerName})`);
    return;
  }

  const golden = await loadGolden(storageRoot, workerName, datasetId);
  if (golden) {
    console.log(`Golden: blessed ${golden.blessedAt.slice(0, 10)}\n`);
  }

  const W_TS = 24;
  const W_DUR = 10;
  const W_COST = 10;
  console.log(
    `${"Timestamp".padEnd(W_TS)} ${"Duration".padStart(W_DUR)} ${"Cost".padStart(W_COST)}`,
  );
  console.log("─".repeat(W_TS + W_DUR + W_COST + 2));

  const display = runs.slice(-limit);
  for (const run of display) {
    const durStr = `${(run.durationMs / 1000).toFixed(1)}s`;
    const costStr = run.cost != null ? `$${run.cost.toFixed(4)}` : "—";
    console.log(
      `${run.timestamp.slice(0, 19).padEnd(W_TS)} ${durStr.padStart(W_DUR)} ${costStr.padStart(W_COST)}`,
    );
  }

  if (runs.length > limit) {
    console.log(`\n(showing latest ${limit} of ${runs.length} runs)`);
  }
}
