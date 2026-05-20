import { loadConfig, resolveWorker } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { saveRun, loadGolden } from "../storage/index";
import type { EvalContext, EvalRun, CostReport } from "../types";

export async function cmdEval(
  datasetId: string,
  opts: { worker?: string; diff?: boolean; format?: string },
): Promise<void> {
  const config = await loadConfig();
  const { name: workerName, worker } = resolveWorker(config, opts.worker);
  const storageRoot = getStorageRoot(config);

  console.log(`Running eval: ${datasetId} (worker: ${workerName})`);

  let inputs: unknown = undefined;
  if (worker.inputs) {
    inputs = await worker.inputs(datasetId);
  }

  let cost: CostReport | undefined;
  const metadata: Record<string, unknown> = {};

  const ctx: EvalContext = {
    datasetId,
    inputs,
    reportCost: (c) => { cost = c; },
    reportMeta: (key, value) => { metadata[key] = value; },
  };

  const start = Date.now();
  const output = await worker.run(ctx);
  const durationMs = Date.now() - start;

  const run: EvalRun = {
    timestamp: new Date().toISOString(),
    datasetId,
    worker: workerName,
    durationMs,
    cost,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    output,
  };

  await saveRun(storageRoot, workerName, datasetId, run);

  console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`);
  if (cost) {
    console.log(`  Cost: $${cost.total.toFixed(4)}`);
  }
  console.log(`  Run saved: .ee/${workerName}/${datasetId}/runs/`);

  if (opts.diff === false) {
    console.log("\nSkipping diff (--no-diff).");
    return;
  }

  const golden = await loadGolden(storageRoot, workerName, datasetId);
  if (!golden) {
    console.log("\nNo golden to compare against. Run `ee bless` first.");
    console.log("\nOutput preview:");
    console.log(JSON.stringify(output, null, 2).slice(0, 500));
    return;
  }

  // TODO: Implement diff engine
  console.log(`\nGolden: blessed ${golden.blessedAt.slice(0, 10)}`);
  console.log("\n[diff engine not yet implemented — coming soon]");
  console.log("Run `ee bless` to promote this output, or `ee report` to view details.");
}
