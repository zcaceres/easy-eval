import { loadConfig } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { discoverDatasets } from "../storage/index";
import { bold, dim, green, yellow } from "../render/colors";

export async function cmdStatus(opts: { format?: string; config?: string } = {}): Promise<void> {
  const config = await loadConfig(opts.config);
  const storageRoot = getStorageRoot(config);

  const datasets = await discoverDatasets(storageRoot);

  if (opts.format === "json") {
    console.log(JSON.stringify({ datasets }, null, 2));
    return;
  }

  if (datasets.length === 0) {
    console.log("No eval data yet.");
    console.log("\nGet started:");
    console.log(dim("  ee eval <datasetId>    Run your first eval"));
    console.log(dim("  ee bless <datasetId>   Bless output as golden"));
    return;
  }

  const W_DS = 24;
  const W_EVAL = 12;
  const W_GOLDEN = 14;
  const W_RUNS = 6;
  const W_LATEST = 20;

  console.log(
    bold(`${"Dataset".padEnd(W_DS)} ${"Eval".padEnd(W_EVAL)} ${"Golden".padEnd(W_GOLDEN)} ${"Runs".padStart(W_RUNS)} ${"Latest Run".padEnd(W_LATEST)}`),
  );
  console.log(dim("─".repeat(W_DS + W_EVAL + W_GOLDEN + W_RUNS + W_LATEST + 4)));

  for (const ds of datasets) {
    const goldenStr = ds.hasGolden && ds.goldenBlessedAt
      ? green(ds.goldenBlessedAt.slice(0, 10))
      : yellow("—");
    const latestStr = ds.latestRunTimestamp
      ? ds.latestRunTimestamp.slice(0, 19)
      : dim("—");

    console.log(
      `${ds.datasetId.padEnd(W_DS)} ${dim(ds.worker.padEnd(W_EVAL))} ${goldenStr.padEnd(W_GOLDEN)} ${String(ds.runCount).padStart(W_RUNS)} ${latestStr.padEnd(W_LATEST)}`,
    );
  }
}
