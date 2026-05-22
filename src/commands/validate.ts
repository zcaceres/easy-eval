import { loadConfig, resolveWorker } from "../config/loader";
import { dim, green, red, yellow } from "../render/colors";
import { validateWorkerConfig, validateOutput, type ValidationIssue } from "../validation";
import type { WorkerConfig } from "../types";

interface TaggedIssue extends ValidationIssue {
  worker: string;
}

export async function cmdValidate(opts: { worker?: string; probe?: string }): Promise<void> {
  let config;
  try {
    config = await loadConfig();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(red("Config failed to load:") + " " + msg);
    process.exit(1);
  }

  const issues: TaggedIssue[] = [];
  const workerNames = Object.keys(config.workers);

  if (workerNames.length === 0) {
    issues.push({ level: "error", worker: "(config)", message: "No workers defined in config" });
  }

  const workersToCheck = opts.worker
    ? [opts.worker]
    : workerNames;

  for (const name of workersToCheck) {
    const worker = config.workers[name];
    if (!worker) {
      issues.push({ level: "error", worker: name, message: `Worker "${name}" not found` });
      continue;
    }
    for (const issue of validateWorkerConfig(worker)) {
      issues.push({ ...issue, worker: name });
    }
  }

  if (opts.probe) {
    const { name, worker } = resolveWorker(config, opts.worker);
    await probeWorker(name, worker, opts.probe, issues);
  }

  printResults(issues, opts.probe);
}

async function probeWorker(
  name: string,
  worker: WorkerConfig,
  datasetId: string,
  issues: TaggedIssue[],
): Promise<void> {
  let inputs: unknown;
  if (worker.inputs) {
    try {
      inputs = await worker.inputs(datasetId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      issues.push({ level: "error", worker: name, message: `inputs("${datasetId}") threw: ${msg}` });
      return;
    }
  }

  let output: unknown;
  try {
    output = await worker.run({
      datasetId,
      inputs,
      reportCost: () => {},
      reportMeta: () => {},
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    issues.push({ level: "error", worker: name, message: `run() threw: ${msg}` });
    return;
  }

  if (worker.schema) {
    for (const issue of validateOutput(output, worker.schema)) {
      issues.push({ ...issue, worker: name });
    }
  }
}

function printResults(issues: TaggedIssue[], probed: string | undefined): void {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warn");

  if (issues.length === 0) {
    console.log(green("Config is valid."));
    if (!probed) {
      console.log(dim("Tip: use --probe <datasetId> to also validate output shape against your schema."));
    }
    return;
  }

  for (const issue of errors) {
    console.log(red("error") + dim(` [${issue.worker}]`) + ` ${issue.message}`);
  }
  for (const issue of warnings) {
    console.log(yellow("warn") + dim(` [${issue.worker}]`) + ` ${issue.message}`);
  }

  console.log("");
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);

  if (errors.length > 0) {
    process.exit(1);
  }
}
