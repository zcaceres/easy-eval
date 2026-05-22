import { loadConfig, resolveEval } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { saveGolden, loadRun, loadLatestRun } from "../storage/index";
import { bold, dim, green } from "../render/colors";
import type { EvalContext, Golden, CostReport } from "../types";

export async function cmdBless(
  datasetId: string,
  opts: { worker?: string; fromRun?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const { name: evalName, evalDef } = resolveEval(config, opts.worker);
  const storageRoot = getStorageRoot(config);

  let golden: Golden;

  if (opts.fromRun) {
    const run = await loadRun(storageRoot, evalName, datasetId, opts.fromRun);
    if (!run) {
      console.error(`No eval run found for ${datasetId} at ${opts.fromRun}`);
      process.exit(1);
    }
    golden = {
      blessedAt: new Date().toISOString(),
      datasetId,
      worker: evalName,
      output: run.output,
      metadata: run.metadata,
    };
    console.log(`Blessing from eval run ${dim(opts.fromRun)}`);
  } else {
    const latestRun = await loadLatestRun(storageRoot, evalName, datasetId);

    if (latestRun) {
      golden = {
        blessedAt: new Date().toISOString(),
        datasetId,
        worker: evalName,
        output: latestRun.output,
        metadata: latestRun.metadata,
      };
      console.log(`Blessing from latest eval run ${dim(`(${latestRun.timestamp.slice(0, 19)})`)}`);
    } else {
      console.log(`No existing runs. Running eval first...`);

      let inputs: unknown = undefined;
      if (evalDef.inputs) {
        inputs = await evalDef.inputs(datasetId);
      }

      let cost: CostReport | undefined;
      const metadata: Record<string, unknown> = {};

      const ctx: EvalContext = {
        datasetId,
        inputs,
        vars: {},
        reportCost: (c) => { cost = c; },
        reportMeta: (key, value) => { metadata[key] = value; },
      };

      const output = await evalDef.eval(ctx);

      golden = {
        blessedAt: new Date().toISOString(),
        datasetId,
        worker: evalName,
        output,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };
      console.log("Blessing from fresh eval run");
    }
  }

  await saveGolden(storageRoot, evalName, datasetId, golden);
  console.log(green(`\nGolden saved for ${datasetId}`) + dim(` (${evalName})`));
  console.log(dim(`  Location: .ee/${evalName}/${datasetId}/golden.json`));
}
