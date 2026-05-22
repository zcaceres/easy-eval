import { createInterface } from "readline";
import { loadConfig, resolveEval } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { saveRun, loadGolden, saveChange } from "../storage/index";
import { diff } from "../diff/index";
import { renderDiffTable, renderDetailedDiff, renderOutputTable } from "../render/table";
import { bold, dim, green, red, yellow } from "../render/colors";
import { validateEvalDef, validateOutput } from "../validation";
import type { EvalContext, EvalRun, CostReport, Change, DiffResult } from "../types";

export async function cmdEval(
  datasetId: string,
  opts: { worker?: string; var?: Record<string, string>; diff?: boolean; format?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const { name: evalName, evalDef } = resolveEval(config, opts.worker);

  const configIssues = validateEvalDef(evalDef);
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

  console.log(bold(`Running eval: ${datasetId}`) + dim(` (${evalName})`));

  let inputs: unknown = undefined;
  if (evalDef.inputs) {
    inputs = await evalDef.inputs(datasetId);
  }

  let cost: CostReport | undefined;
  const metadata: Record<string, unknown> = {};

  const vars = opts.var ?? {};

  const ctx: EvalContext = {
    datasetId,
    inputs,
    vars,
    reportCost: (c) => { cost = c; },
    reportMeta: (key, value) => { metadata[key] = value; },
  };

  const start = Date.now();
  const output = await evalDef.eval(ctx);
  const durationMs = Date.now() - start;

  if (evalDef.diffSchema) {
    const outputIssues = validateOutput(output, evalDef.diffSchema);
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
      console.error(dim("\nThe eval function returned data that doesn't match your configured schema."));
      console.error(dim("Check that your eval() output shape matches the paths in schema.sections."));
      process.exit(1);
    }
  }

  const run: EvalRun = {
    timestamp: new Date().toISOString(),
    datasetId,
    worker: evalName,
    durationMs,
    cost,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    output,
  };

  await saveRun(storageRoot, evalName, datasetId, run);

  console.log(dim(`  Duration: ${(durationMs / 1000).toFixed(1)}s`));
  if (cost) {
    console.log(dim(`  Cost: $${cost.total.toFixed(4)}`));
  }
  console.log(dim(`  Run saved: .ee/${evalName}/${datasetId}/runs/`));

  if (opts.diff === false) {
    console.log(yellow("\nSkipping diff (--no-diff)."));
    return;
  }

  const golden = await loadGolden(storageRoot, evalName, datasetId);
  if (!golden) {
    console.log(yellow("\nNo golden to compare against."));
    console.log(dim("Run `ee bless " + datasetId + "` to promote this output to golden.\n"));
    if (evalDef.diffSchema) {
      console.log(renderOutputTable(output, evalDef.diffSchema));
    } else {
      console.log(JSON.stringify(output, null, 2));
    }
    return;
  }

  console.log(`\n${dim("Golden:")} blessed ${golden.blessedAt.slice(0, 10)}`);

  const result = diff(golden.output, output, evalDef.diffSchema);
  console.log();
  console.log(renderDiffTable(result));
  console.log();
  console.log(renderDetailedDiff(result));

  await promptCodify(storageRoot, evalName, datasetId, run, inputs, vars, result);
}

async function promptCodify(
  storageRoot: string,
  worker: string,
  datasetId: string,
  run: EvalRun,
  inputs: unknown,
  vars: Record<string, string>,
  result: DiffResult,
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question(`\nCodify this change? [y/N] `, (a) => resolve(a.trim().toLowerCase()));
    });

    if (answer !== "y" && answer !== "yes") return;

    const note = await new Promise<string>((resolve) => {
      rl.question(`Note (optional): `, (a) => resolve(a.trim()));
    });

    const change: Change = {
      timestamp: new Date().toISOString(),
      datasetId,
      worker,
      runTimestamp: run.timestamp,
      inputs,
      vars,
      diff: result,
      note: note || undefined,
      metadata: run.metadata,
    };

    await saveChange(storageRoot, change);
    console.log(green("✓ Change saved") + dim(` to .ee/changes/`));
  } finally {
    rl.close();
  }
}
