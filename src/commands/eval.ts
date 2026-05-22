import { loadConfig, resolveWorker } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { saveRun, loadGolden } from "../storage/index";
import { diff } from "../diff/index";
import { renderDiffTable, renderDetailedDiff, renderOutputTable } from "../render/table";
import { bold, dim, green, red, yellow } from "../render/colors";
import { validateWorkerConfig, validateOutput } from "../validation";
import type { EvalContext, EvalRun, CostReport } from "../types";

export async function cmdEval(
  datasetId: string,
  opts: { worker?: string; diff?: boolean; format?: string },
): Promise<void> {
  const config = await loadConfig();
  const { name: workerName, worker } = resolveWorker(config, opts.worker);

  const configIssues = validateWorkerConfig(worker);
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

  console.log(bold(`Running eval: ${datasetId}`) + dim(` (worker: ${workerName})`));

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

  if (worker.schema) {
    const outputIssues = validateOutput(output, worker.schema);
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
      console.error(dim("\nThe run function returned data that doesn't match your configured schema."));
      console.error(dim("Check that your run() output shape matches the paths in schema.sections."));
      process.exit(1);
    }
  }

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

  console.log(dim(`  Duration: ${(durationMs / 1000).toFixed(1)}s`));
  if (cost) {
    console.log(dim(`  Cost: $${cost.total.toFixed(4)}`));
  }
  console.log(dim(`  Run saved: .ee/${workerName}/${datasetId}/runs/`));

  if (opts.diff === false) {
    console.log(yellow("\nSkipping diff (--no-diff)."));
    return;
  }

  const golden = await loadGolden(storageRoot, workerName, datasetId);
  if (!golden) {
    console.log(yellow("\nNo golden to compare against."));
    console.log(dim("Run `ee bless " + datasetId + "` to promote this output to golden.\n"));
    if (worker.schema) {
      console.log(renderOutputTable(output, worker.schema));
    } else {
      console.log(JSON.stringify(output, null, 2));
    }
    return;
  }

  console.log(`\n${dim("Golden:")} blessed ${golden.blessedAt.slice(0, 10)}`);

  const result = diff(golden.output, output, worker.schema);
  console.log();
  console.log(renderDiffTable(result));
  console.log();
  console.log(renderDetailedDiff(result));
}
