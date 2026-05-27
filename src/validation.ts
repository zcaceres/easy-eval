import type { DiffSchema, SectionConfig, EvalDef } from "./types";

export interface ValidationIssue {
  level: "error" | "warn";
  message: string;
}

const VALID_KINDS = ["scalar", "keyed-array", "set", "ordered-array"] as const;

export function validateEvalDef(evalDef: EvalDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (typeof evalDef.eval !== "function") {
    issues.push({ level: "error", message: "`eval` is not a function" });
  }

  if (evalDef.inputs !== undefined && typeof evalDef.inputs !== "function") {
    issues.push({ level: "error", message: "`inputs` is defined but not a function" });
  }

  if (evalDef.diffSchema) {
    issues.push(...validateSchemaConfig(evalDef.diffSchema));
  }

  return issues;
}

export function validateSchemaConfig(schema: DiffSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(schema.sections)) {
    issues.push({ level: "error", message: "`schema.sections` must be an array" });
    return issues;
  }

  if (schema.sections.length === 0) {
    issues.push({ level: "warn", message: "Schema has no sections (auto-diff will be used)" });
    return issues;
  }

  const paths = new Set<string>();
  const labels = new Set<string>();

  for (let i = 0; i < schema.sections.length; i++) {
    const section = schema.sections[i];
    const prefix = `sections[${i}]`;

    if (!section || typeof section !== "object") {
      issues.push({ level: "error", message: `${prefix}: must be an object` });
      continue;
    }

    if (!section.path || typeof section.path !== "string") {
      issues.push({ level: "error", message: `${prefix}: missing or empty \`path\`` });
    } else if (paths.has(section.path)) {
      issues.push({ level: "warn", message: `${prefix}: duplicate path "${section.path}"` });
    } else {
      paths.add(section.path);
    }

    if (!section.label || typeof section.label !== "string") {
      issues.push({ level: "error", message: `${prefix}: missing or empty \`label\`` });
    } else if (labels.has(section.label)) {
      issues.push({ level: "warn", message: `${prefix}: duplicate label "${section.label}"` });
    } else {
      labels.add(section.label);
    }

    if (typeof section.kind !== "string" || !VALID_KINDS.includes(section.kind as any)) {
      issues.push({ level: "error", message: `${prefix}: invalid kind "${String(section.kind)}"` });
    }

    if (section.kind === "keyed-array") {
      if (!section.key) {
        issues.push({ level: "error", message: `${prefix}: keyed-array at "${section.path}" is missing \`key\`` });
      } else if (typeof section.key !== "string" && typeof section.key !== "function") {
        issues.push({ level: "error", message: `${prefix}: \`key\` must be a string or function` });
      }
    }
  }

  return issues;
}

export function validateOutput(output: unknown, schema: DiffSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (output === undefined || output === null) {
    issues.push({ level: "error", message: "Output is null/undefined" });
    return issues;
  }

  if (typeof output !== "object") {
    issues.push({ level: "warn", message: `Output is a ${typeof output}, not an object` });
    return issues;
  }

  for (const section of schema.sections) {
    const value = getPath(output, section.path);

    if (value === undefined) {
      issues.push({ level: "error", message: `Schema path "${section.path}" not found in output` });
      continue;
    }

    switch (section.kind) {
      case "scalar":
        if (Array.isArray(value)) {
          issues.push({ level: "warn", message: `"${section.path}" is scalar but output has an array` });
        }
        break;

      case "keyed-array":
      case "set":
      case "ordered-array":
        if (!Array.isArray(value)) {
          issues.push({ level: "error", message: `"${section.path}" is ${section.kind} but output is not an array` });
        } else if (section.kind === "keyed-array" && value.length > 0) {
          validateKeyedArrayItems(section.path, section.key, value, issues);
        }
        break;
    }
  }

  return issues;
}

function validateKeyedArrayItems(
  path: string,
  key: string | ((item: unknown) => string),
  items: unknown[],
  issues: ValidationIssue[],
): void {
  if (typeof key !== "string") return;

  const firstItem = items[0];
  if (firstItem === null || typeof firstItem !== "object") {
    issues.push({ level: "error", message: `"${path}" items should be objects, got ${typeof firstItem}` });
    return;
  }

  if (!(key in firstItem)) {
    issues.push({ level: "error", message: `"${path}" keyed by "${key}" but first item lacks that field` });
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
