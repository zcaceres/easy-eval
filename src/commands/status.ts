import { loadConfig } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { discoverDatasets } from "../storage/index";

export async function cmdStatus(): Promise<void> {
  const config = await loadConfig();
  const storageRoot = getStorageRoot(config);

  const datasets = await discoverDatasets(storageRoot);

  if (datasets.length === 0) {
    console.log("No eval data yet.");
    console.log("\nGet started:");
    console.log("  ee eval <datasetId>    Run your first eval");
    console.log("  ee bless <datasetId>   Bless output as golden");
    return;
  }

  const W_DS = 24;
  const W_WORKER = 12;
  const W_GOLDEN = 14;
  const W_RUNS = 6;
  const W_LATEST = 20;

  console.log(
    `${"Dataset".padEnd(W_DS)} ${"Worker".padEnd(W_WORKER)} ${"Golden".padEnd(W_GOLDEN)} ${"Runs".padStart(W_RUNS)} ${"Latest Run".padEnd(W_LATEST)}`,
  );
  console.log("─".repeat(W_DS + W_WORKER + W_GOLDEN + W_RUNS + W_LATEST + 4));

  for (const ds of datasets) {
    const goldenStr = ds.hasGolden && ds.goldenBlessedAt
      ? ds.goldenBlessedAt.slice(0, 10)
      : "—";
    const latestStr = ds.latestRunTimestamp
      ? ds.latestRunTimestamp.slice(0, 19)
      : "—";

    console.log(
      `${ds.datasetId.padEnd(W_DS)} ${ds.worker.padEnd(W_WORKER)} ${goldenStr.padEnd(W_GOLDEN)} ${String(ds.runCount).padStart(W_RUNS)} ${latestStr.padEnd(W_LATEST)}`,
    );
  }
}
