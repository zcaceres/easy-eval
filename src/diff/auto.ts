import type { DiffResult, SectionDiff, DetailRow, RowStatus } from "../types";
import { deepEqual } from "../utils";

export function autoDiff(golden: unknown, eval_: unknown): DiffResult {
  const sections: SectionDiff[] = [];

  if (isObject(golden) && isObject(eval_)) {
    const allKeys = [...new Set([...Object.keys(golden), ...Object.keys(eval_)])].sort();

    for (const key of allKeys) {
      const gVal = golden[key];
      const eVal = eval_[key];
      sections.push(...diffValue(key, key, gVal, eVal));
    }
  } else {
    sections.push(...diffValue("root", "root", golden, eval_));
  }

  const summary = { matches: 0, changed: 0, missing: 0, new: 0 };
  for (const s of sections) {
    for (const r of s.rows) {
      summary[r.status === "match" ? "matches" : r.status]++;
    }
  }

  return { sections, summary };
}

function diffValue(label: string, path: string, golden: unknown, eval_: unknown): SectionDiff[] {
  if (Array.isArray(golden) || Array.isArray(eval_)) {
    return diffArrays(label, path, asArray(golden), asArray(eval_));
  }

  if (isObject(golden) && isObject(eval_)) {
    return diffObjects(label, path, golden, eval_);
  }
  if (isObject(eval_) && (golden === undefined || golden === null)) {
    return diffObjects(label, path, {} as Record<string, unknown>, eval_);
  }
  if (isObject(golden) && (eval_ === undefined || eval_ === null)) {
    return diffObjects(label, path, golden, {} as Record<string, unknown>);
  }

  return [diffScalar(label, path, golden, eval_)];
}

function diffScalar(label: string, path: string, golden: unknown, eval_: unknown): SectionDiff {
  const gStr = displayValue(golden);
  const eStr = displayValue(eval_);
  const match = deepEqual(golden, eval_);

  let status: RowStatus;
  if (match) status = "match";
  else if (golden === undefined || golden === null) status = "new";
  else if (eval_ === undefined || eval_ === null) status = "missing";
  else status = "changed";

  const gPresent = golden !== undefined && golden !== null;
  const ePresent = eval_ !== undefined && eval_ !== null;

  return {
    label,
    path,
    goldenCount: gPresent ? "1" : "0",
    evalCount: ePresent ? "1" : "0",
    delta: match ? "=" : "~",
    rows: [{ status, key: label, golden: gStr, eval: eStr }],
  };
}

function diffObjects(label: string, path: string, golden: Record<string, unknown>, eval_: Record<string, unknown>): SectionDiff[] {
  const allKeys = [...new Set([...Object.keys(golden), ...Object.keys(eval_)])].sort();
  const rows: DetailRow[] = [];
  const childSections: SectionDiff[] = [];

  for (const key of allKeys) {
    const gVal = golden[key];
    const eVal = eval_[key];
    const gStr = displayValue(gVal);
    const eStr = displayValue(eVal);

    let status: RowStatus;
    if (deepEqual(gVal, eVal)) status = "match";
    else if (gVal === undefined || gVal === null) status = "new";
    else if (eVal === undefined || eVal === null) status = "missing";
    else status = "changed";

    rows.push({ status, key, golden: gStr, eval: eStr });

    const nested = (isObject(gVal) || isObject(eVal) || Array.isArray(gVal) || Array.isArray(eVal));
    if (nested && status !== "match") {
      const childPath = path ? `${path}.${key}` : key;
      childSections.push(...diffValue(key, childPath, gVal, eVal));
    }
  }

  const gCount = Object.keys(golden).length;
  const eCount = Object.keys(eval_).length;

  return [{
    label,
    path,
    goldenCount: gCount,
    evalCount: eCount,
    delta: deltaStr(gCount, eCount),
    rows,
  }, ...childSections];
}

function diffArrays(label: string, path: string, golden: unknown[], eval_: unknown[]): SectionDiff[] {
  if (golden.length > 0 && isObject(golden[0]) && eval_.length > 0 && isObject(eval_[0])) {
    return diffObjectArrays(label, path, golden as Record<string, unknown>[], eval_ as Record<string, unknown>[]);
  }

  return diffPrimitiveArrays(label, path, golden, eval_);
}

function diffPrimitiveArrays(label: string, path: string, golden: unknown[], eval_: unknown[]): SectionDiff[] {
  const serialize = (v: unknown) => JSON.stringify(v) ?? "null";
  const gSet = new Set(golden.map(serialize));
  const eSet = new Set(eval_.map(serialize));
  const all = [...new Set([...gSet, ...eSet])].sort();

  const rows: DetailRow[] = all.map((serialized) => {
    const inG = gSet.has(serialized);
    const inE = eSet.has(serialized);
    const d = displayValue(JSON.parse(serialized));
    if (inG && inE) return { status: "match" as const, key: d, golden: d, eval: d };
    if (inG) return { status: "missing" as const, key: d, golden: d, eval: "" };
    return { status: "new" as const, key: d, golden: "", eval: d };
  });

  return [{
    label,
    path,
    goldenCount: golden.length,
    evalCount: eval_.length,
    delta: deltaStr(golden.length, eval_.length),
    rows,
  }];
}

function diffObjectArrays(label: string, path: string, golden: Record<string, unknown>[], eval_: Record<string, unknown>[]): SectionDiff[] {
  const keyField = guessKeyField(golden, eval_);

  if (keyField) {
    return diffKeyedObjectArrays(label, path, golden, eval_, keyField);
  }

  const rows: DetailRow[] = [];
  const maxLen = Math.max(golden.length, eval_.length);
  for (let i = 0; i < maxLen; i++) {
    const gItem = golden[i];
    const eItem = eval_[i];
    if (gItem && eItem) {
      const gStr = JSON.stringify(gItem);
      const eStr = JSON.stringify(eItem);
      rows.push({
        status: gStr === eStr ? "match" : "changed",
        key: `[${i}]`,
        golden: compactDisplay(gItem),
        eval: compactDisplay(eItem),
      });
    } else if (gItem) {
      rows.push({ status: "missing", key: `[${i}]`, golden: compactDisplay(gItem), eval: "" });
    } else if (eItem) {
      rows.push({ status: "new", key: `[${i}]`, golden: "", eval: compactDisplay(eItem) });
    }
  }

  return [{
    label,
    path,
    goldenCount: golden.length,
    evalCount: eval_.length,
    delta: deltaStr(golden.length, eval_.length),
    rows,
  }];
}

function diffKeyedObjectArrays(
  label: string,
  path: string,
  golden: Record<string, unknown>[],
  eval_: Record<string, unknown>[],
  keyField: string,
): SectionDiff[] {
  const gByKey = new Map(golden.map((item) => [String(item[keyField]), item]));
  const eByKey = new Map(eval_.map((item) => [String(item[keyField]), item]));
  const allKeys = [...new Set([...gByKey.keys(), ...eByKey.keys()])].sort();

  const rows: DetailRow[] = [];
  for (const key of allKeys) {
    const gItem = gByKey.get(key);
    const eItem = eByKey.get(key);
    if (gItem && eItem) {
      const match = deepEqual(gItem, eItem);
      rows.push({
        status: match ? "match" : "changed",
        key,
        golden: compactDisplay(gItem),
        eval: compactDisplay(eItem),
      });
    } else if (gItem) {
      rows.push({ status: "missing", key, golden: compactDisplay(gItem), eval: "" });
    } else if (eItem) {
      rows.push({ status: "new", key, golden: "", eval: compactDisplay(eItem) });
    }
  }

  return [{
    label,
    path,
    goldenCount: golden.length,
    evalCount: eval_.length,
    delta: deltaStr(golden.length, eval_.length),
    rows,
  }];
}

function guessKeyField(golden: Record<string, unknown>[], eval_: Record<string, unknown>[]): string | null {
  const sample = golden[0] ?? eval_[0];
  if (!sample) return null;

  const candidates = ["id", "name", "key", "type", "label", "title", "slug"];
  for (const field of candidates) {
    if (field in sample && typeof sample[field] === "string") {
      return field;
    }
  }

  for (const [field, val] of Object.entries(sample)) {
    if (typeof val === "string" && field.toLowerCase().includes("name")) return field;
    if (typeof val === "string" && field.toLowerCase().includes("id")) return field;
  }

  return null;
}

// ─── Utilities ─────────────────────────────────────────────────────

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function asArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  return [val];
}

function displayValue(val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return `[${val.length} items]`;
  if (isObject(val)) return compactDisplay(val);
  return String(val);
}

function compactDisplay(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj);
  const parts: string[] = [];
  for (const [k, v] of entries) {
    if (Array.isArray(v) || isObject(v)) continue;
    if (v === undefined || v === null) continue;
    parts.push(`${k}: ${v}`);
    if (parts.length >= 3) break;
  }
  return parts.join(", ");
}


function deltaStr(g: number, e: number): string {
  if (g === e) return "=";
  const d = e - g;
  return d > 0 ? `+${d}` : `${d}`;
}
