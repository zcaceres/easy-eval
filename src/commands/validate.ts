import { loadConfig, resolveEval } from "../config/loader";
import { dim, green, red, yellow } from "../render/colors";
import { validateEvalDef, validateOutput, type ValidationIssue } from "../validation";
import type { EvalDef } from "../types";

interface TaggedIssue extends ValidationIssue {
  eval: string;
}

export async function cmdValidate(opts: { worker?: string; probe?: string; config?: string }): Promise<void> {
  let config;
  try {
    config = await loadConfig(opts.config);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(red("Config failed to load:") + " " + msg);
    process.exit(1);
  }

  const issues: TaggedIssue[] = [];
  const evalNames = Object.keys(config.evals);

  if (evalNames.length === 0) {
    issues.push({ level: "error", eval: "(config)", message: "No evals defined in config" });
  }

  const evalsToCheck = opts.worker
    ? [opts.worker]
    : evalNames;

  for (const name of evalsToCheck) {
    const evalDef = config.evals[name];
    if (!evalDef) {
      issues.push({ level: "error", eval: name, message: `Eval "${name}" not found` });
      continue;
    }
    for (const issue of validateEvalDef(evalDef)) {
      issues.push({ ...issue, eval: name });
    }
  }

  if (opts.probe) {
    const { name, evalDef } = resolveEval(config, opts.worker);
    await probeEval(name, evalDef, opts.probe, issues);
  }

  printResults(issues, opts.probe);
}

async function probeEval(
  name: string,
  evalDef: EvalDef,
  datasetId: string,
  issues: TaggedIssue[],
): Promise<void> {
  let inputs: unknown;
  if (evalDef.inputs) {
    try {
      inputs = await evalDef.inputs(datasetId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      issues.push({ level: "error", eval: name, message: `inputs("${datasetId}") threw: ${msg}` });
      return;
    }
  }

  let output: unknown;
  try {
    output = await evalDef.eval({
      datasetId,
      inputs,
      vars: {},
      reportCost: () => {},
      reportMeta: () => {},
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    issues.push({ level: "error", eval: name, message: `eval() threw: ${msg}` });
    return;
  }

  if (evalDef.diffSchema) {
    for (const issue of validateOutput(output, evalDef.diffSchema)) {
      issues.push({ ...issue, eval: name });
    }
  }
}

function printResults(issues: TaggedIssue[], probed: string | undefined): void {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warn");

  if (issues.length === 0) {
    console.log(green("Config is valid."));
    if (!probed) {
      console.log(dim("Tip: use --probe <datasetId> to also validate output shape against your diffSchema."));
    }
    return;
  }

  for (const issue of errors) {
    console.log(red("error") + dim(` [${issue.eval}]`) + ` ${issue.message}`);
  }
  for (const issue of warnings) {
    console.log(yellow("warn") + dim(` [${issue.eval}]`) + ` ${issue.message}`);
  }

  console.log("");
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);

  if (errors.length > 0) {
    process.exit(1);
  }
}
