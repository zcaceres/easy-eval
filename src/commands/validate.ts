import { loadConfig, resolveWorker } from "../config/loader";
import { dim, green, red, yellow } from "../render/colors";
import type { DiffSchema, WorkerConfig } from "../types";

interface ValidationIssue {
  level: "error" | "warn";
  worker: string;
  message: string;
}

const VALID_KINDS = ["scalar", "keyed-array", "set", "ordered-array"] as const;

export async function cmdValidate(opts: { worker?: string; probe?: string }): Promise<void> {
  let config;
  try {
    config = await loadConfig();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(red("Config failed to load:") + " " + msg);
    process.exit(1);
  }

  const issues: ValidationIssue[] = [];
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
    validateWorker(name, worker, issues);
  }

  if (opts.probe) {
    const { name, worker } = resolveWorker(config, opts.worker);
    await probeWorker(name, worker, opts.probe, issues);
  }

  printResults(issues, opts.probe);
}

function validateWorker(name: string, worker: WorkerConfig, issues: ValidationIssue[]): void {
  if (typeof worker.run !== "function") {
    issues.push({ level: "error", worker: name, message: "`run` is not a function" });
  }

  if (worker.inputs !== undefined && typeof worker.inputs !== "function") {
    issues.push({ level: "error", worker: name, message: "`inputs` is defined but not a function" });
  }

  if (worker.schema) {
    validateSchema(name, worker.schema, issues);
  }
}

function validateSchema(worker: string, schema: DiffSchema, issues: ValidationIssue[]): void {
  if (!Array.isArray(schema.sections)) {
    issues.push({ level: "error", worker, message: "`schema.sections` must be an array" });
    return;
  }

  if (schema.sections.length === 0) {
    issues.push({ level: "warn", worker, message: "Schema has no sections (auto-diff will be used)" });
    return;
  }

  const paths = new Set<string>();
  const labels = new Set<string>();

  for (let i = 0; i < schema.sections.length; i++) {
    const section = schema.sections[i];
    const prefix = `sections[${i}]`;

    if (!section || typeof section !== "object") {
      issues.push({ level: "error", worker, message: `${prefix}: must be an object` });
      continue;
    }

    if (!section.path || typeof section.path !== "string") {
      issues.push({ level: "error", worker, message: `${prefix}: missing or empty \`path\`` });
    } else if (paths.has(section.path)) {
      issues.push({ level: "warn", worker, message: `${prefix}: duplicate path "${section.path}"` });
    } else {
      paths.add(section.path);
    }

    if (!section.label || typeof section.label !== "string") {
      issues.push({ level: "error", worker, message: `${prefix}: missing or empty \`label\`` });
    } else if (labels.has(section.label)) {
      issues.push({ level: "warn", worker, message: `${prefix}: duplicate label "${section.label}"` });
    } else {
      labels.add(section.label);
    }

    if (typeof section.kind !== "string" || !VALID_KINDS.includes(section.kind as any)) {
      issues.push({ level: "error", worker, message: `${prefix}: invalid kind "${String(section.kind)}"` });
    }

    if (section.kind === "keyed-array") {
      if (!section.key) {
        issues.push({ level: "error", worker, message: `${prefix}: keyed-array at "${section.path}" is missing \`key\`` });
      } else if (typeof section.key !== "string" && typeof section.key !== "function") {
        issues.push({ level: "error", worker, message: `${prefix}: \`key\` must be a string or function` });
      }
    }
  }
}

async function probeWorker(
  name: string,
  worker: WorkerConfig,
  datasetId: string,
  issues: ValidationIssue[],
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

  if (output === undefined || output === null) {
    issues.push({ level: "error", worker: name, message: "run() returned null/undefined" });
    return;
  }

  if (typeof output !== "object") {
    issues.push({ level: "warn", worker: name, message: `run() returned a ${typeof output}, not an object` });
    return;
  }

  if (worker.schema) {
    validateOutputAgainstSchema(name, output, worker.schema, issues);
  }
}

function validateOutputAgainstSchema(
  worker: string,
  output: object,
  schema: DiffSchema,
  issues: ValidationIssue[],
): void {
  for (const section of schema.sections) {
    const value = getPath(output, section.path);

    if (value === undefined) {
      issues.push({ level: "error", worker, message: `Schema path "${section.path}" not found in output` });
      continue;
    }

    switch (section.kind) {
      case "scalar":
        if (Array.isArray(value)) {
          issues.push({ level: "warn", worker, message: `"${section.path}" is scalar but output has an array` });
        }
        break;

      case "keyed-array":
      case "set":
      case "ordered-array":
        if (!Array.isArray(value)) {
          issues.push({ level: "error", worker, message: `"${section.path}" is ${section.kind} but output is not an array` });
        } else if (section.kind === "keyed-array" && value.length > 0) {
          validateKeyedArrayItems(worker, section.path, section.key, value, issues);
        }
        break;
    }
  }
}

function validateKeyedArrayItems(
  worker: string,
  path: string,
  key: string | ((item: unknown) => string),
  items: unknown[],
  issues: ValidationIssue[],
): void {
  if (typeof key !== "string") return;

  const firstItem = items[0];
  if (firstItem === null || typeof firstItem !== "object") {
    issues.push({ level: "error", worker, message: `"${path}" items should be objects, got ${typeof firstItem}` });
    return;
  }

  if (!(key in firstItem)) {
    issues.push({ level: "error", worker, message: `"${path}" keyed by "${key}" but first item lacks that field` });
  }
}

function getPath(obj: object, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function printResults(issues: ValidationIssue[], probed: string | undefined): void {
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
