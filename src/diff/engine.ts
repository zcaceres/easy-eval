import { deepEqual } from "../utils";
import type {
  DiffSchema,
  DiffResult,
  SectionDiff,
  DetailRow,
  RowStatus,
  SectionConfig,
} from "../types";

export function schemaDiff(golden: unknown, eval_: unknown, schema: DiffSchema): DiffResult {
  const gObj = (golden ?? {}) as Record<string, unknown>;
  const eObj = (eval_ ?? {}) as Record<string, unknown>;
  const sections: SectionDiff[] = [];

  for (const section of schema.sections) {
    const gVal = getPath(gObj, section.path);
    const eVal = getPath(eObj, section.path);
    sections.push(diffSection(section, gVal, eVal));
  }

  const summary = { matches: 0, changed: 0, missing: 0, new: 0 };
  for (const s of sections) {
    for (const r of s.rows) {
      summary[r.status === "match" ? "matches" : r.status]++;
    }
  }

  return { sections, summary };
}

function diffSection(config: SectionConfig, golden: unknown, eval_: unknown): SectionDiff {
  switch (config.kind) {
    case "scalar":
      return diffScalar(config, golden, eval_);
    case "keyed-array":
      return diffKeyedArray(config, golden, eval_);
    case "set":
      return diffSet(config, golden, eval_);
    case "ordered-array":
      return diffOrderedArray(config, golden, eval_);
  }
}

function diffScalar(
  config: Extract<SectionConfig, { kind: "scalar" }>,
  golden: unknown,
  eval_: unknown,
): SectionDiff {
  const eq = config.eq ?? deepEqual;
  const display = config.display ?? defaultDisplay;
  const gStr = hasValue(golden) ? display(golden) : "—";
  const eStr = hasValue(eval_) ? display(eval_) : "—";
  const match = eq(golden, eval_);

  let status: RowStatus;
  if (match) status = "match";
  else if (golden === undefined || golden === null) status = "new";
  else if (eval_ === undefined || eval_ === null) status = "missing";
  else status = "changed";

  return {
    label: config.label,
    path: config.path,
    goldenCount: hasValue(golden) ? "1" : "0",
    evalCount: hasValue(eval_) ? "1" : "0",
    delta: match ? "=" : "~",
    rows: [{ status, key: config.label, golden: gStr, eval: eStr }],
  };
}

function diffKeyedArray(
  config: Extract<SectionConfig, { kind: "keyed-array" }>,
  golden: unknown,
  eval_: unknown,
): SectionDiff {
  const gArr = asArray(golden);
  const eArr = asArray(eval_);
  const keyFn = typeof config.key === "function"
    ? config.key
    : (item: unknown) => String((item as Record<string, unknown>)[config.key as string]);
  const eq = config.eq ?? deepEqual;
  const display = config.display ?? defaultItemDisplay;

  const gByKey = new Map<string, unknown>();
  for (const item of gArr) gByKey.set(keyFn(item), item);
  const eByKey = new Map<string, unknown>();
  for (const item of eArr) eByKey.set(keyFn(item), item);

  const allKeys = [...new Set([...gByKey.keys(), ...eByKey.keys()])].sort();
  const rows: DetailRow[] = [];

  for (const key of allKeys) {
    const gItem = gByKey.get(key);
    const eItem = eByKey.get(key);
    if (gItem !== undefined && eItem !== undefined) {
      rows.push({
        status: eq(gItem, eItem) ? "match" : "changed",
        key,
        golden: display(gItem),
        eval: display(eItem),
      });
    } else if (gItem !== undefined) {
      rows.push({ status: "missing", key, golden: display(gItem), eval: "" });
    } else if (eItem !== undefined) {
      rows.push({ status: "new", key, golden: "", eval: display(eItem) });
    }
  }

  return {
    label: config.label,
    path: config.path,
    goldenCount: gArr.length,
    evalCount: eArr.length,
    delta: deltaStr(gArr.length, eArr.length),
    rows,
  };
}

function diffSet(
  config: Extract<SectionConfig, { kind: "set" }>,
  golden: unknown,
  eval_: unknown,
): SectionDiff {
  const gArr = asArray(golden);
  const eArr = asArray(eval_);
  const identity = config.identity ?? ((item: unknown) => typeof item === "string" ? item : JSON.stringify(item));
  const display = config.display ?? defaultItemDisplay;

  const gSet = new Map<string, unknown>();
  for (const item of gArr) gSet.set(identity(item), item);
  const eSet = new Map<string, unknown>();
  for (const item of eArr) eSet.set(identity(item), item);

  const allIds = [...new Set([...gSet.keys(), ...eSet.keys()])].sort();
  const rows: DetailRow[] = [];

  for (const id of allIds) {
    const gItem = gSet.get(id);
    const eItem = eSet.get(id);
    if (gItem !== undefined && eItem !== undefined) {
      rows.push({ status: "match", key: display(gItem), golden: display(gItem), eval: display(eItem) });
    } else if (gItem !== undefined) {
      rows.push({ status: "missing", key: display(gItem), golden: display(gItem), eval: "" });
    } else if (eItem !== undefined) {
      rows.push({ status: "new", key: display(eItem), golden: "", eval: display(eItem) });
    }
  }

  return {
    label: config.label,
    path: config.path,
    goldenCount: gArr.length,
    evalCount: eArr.length,
    delta: deltaStr(gArr.length, eArr.length),
    rows,
  };
}

function diffOrderedArray(
  config: Extract<SectionConfig, { kind: "ordered-array" }>,
  golden: unknown,
  eval_: unknown,
): SectionDiff {
  const gArr = asArray(golden);
  const eArr = asArray(eval_);
  const display = config.display ?? defaultItemDisplay;

  const rows: DetailRow[] = [];
  const maxLen = Math.max(gArr.length, eArr.length);

  for (let i = 0; i < maxLen; i++) {
    const gItem = gArr[i];
    const eItem = eArr[i];
    const key = `[${i}]`;

    if (gItem !== undefined && eItem !== undefined) {
      rows.push({
        status: deepEqual(gItem, eItem) ? "match" : "changed",
        key,
        golden: display(gItem),
        eval: display(eItem),
      });
    } else if (gItem !== undefined) {
      rows.push({ status: "missing", key, golden: display(gItem), eval: "" });
    } else if (eItem !== undefined) {
      rows.push({ status: "new", key, golden: "", eval: display(eItem) });
    }
  }

  return {
    label: config.label,
    path: config.path,
    goldenCount: gArr.length,
    evalCount: eArr.length,
    delta: deltaStr(gArr.length, eArr.length),
    rows,
  };
}

// ─── Utilities ─────────────────────────────────────────────────────

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function asArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  return [val];
}

function hasValue(val: unknown): boolean {
  return val !== undefined && val !== null;
}


function defaultDisplay(val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(val);
}

function defaultItemDisplay(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  return JSON.stringify(item);
}

function deltaStr(g: number, e: number): string {
  if (g === e) return "=";
  const d = e - g;
  return d > 0 ? `+${d}` : `${d}`;
}
