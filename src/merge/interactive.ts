import { createInterface, type Interface as RLInterface } from "readline";
import type { DiffSchema, SectionConfig } from "../types";

// ─── Prompt helpers ──────────────────────────────────────────────────

function ask(rl: RLInterface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim().toLowerCase()));
  });
}

async function askSection(rl: RLInterface, title: string, summary: string): Promise<"g" | "e" | "b" | "i"> {
  console.log(`\n── ${title} ──────────────────────────────────────────────`);
  console.log(`  ${summary}`);
  let answer = "";
  while (!["g", "e", "b", "i"].includes(answer)) {
    answer = await ask(rl, "  → [g]olden / [e]val / [b]oth / [i]tem-by-item? ");
  }
  return answer as "g" | "e" | "b" | "i";
}

async function askKeep(rl: RLInterface, label: string): Promise<boolean> {
  let answer = "";
  while (!["k", "s"].includes(answer)) {
    answer = await ask(rl, `    ${label} → [k]eep / [s]kip? `);
  }
  return answer === "k";
}

async function askChoice(rl: RLInterface, key: string, goldenVal: string, evalVal: string): Promise<"g" | "e" | "s"> {
  console.log(`    ${key}:`);
  console.log(`      G: ${goldenVal}`);
  console.log(`      E: ${evalVal}`);
  let answer = "";
  while (!["g", "e", "s"].includes(answer)) {
    answer = await ask(rl, "      → [g]olden / [e]val / [s]kip? ");
  }
  return answer as "g" | "e" | "s";
}

// ─── Schema-driven merge ─────────────────────────────────────────────

export async function interactiveMerge(
  golden: unknown,
  eval_: unknown,
  schema?: DiffSchema,
): Promise<unknown> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    if (schema) {
      return await schemaMerge(rl, golden as Record<string, unknown>, eval_ as Record<string, unknown>, schema);
    }
    return await autoMerge(rl, golden, eval_);
  } finally {
    rl.close();
  }
}

async function schemaMerge(
  rl: RLInterface,
  golden: Record<string, unknown>,
  eval_: Record<string, unknown>,
  schema: DiffSchema,
): Promise<Record<string, unknown>> {
  const result = { ...golden };

  for (const section of schema.sections) {
    const gVal = getPath(golden, section.path);
    const eVal = getPath(eval_, section.path);

    if (deepEqual(gVal, eVal)) {
      console.log(`\n✓ ${section.label}: match`);
      continue;
    }

    const merged = await mergeSection(rl, section, gVal, eVal);
    setPath(result, section.path, merged);
  }

  return result;
}

async function mergeSection(
  rl: RLInterface,
  config: SectionConfig,
  golden: unknown,
  eval_: unknown,
): Promise<unknown> {
  switch (config.kind) {
    case "scalar":
      return mergeScalar(rl, config, golden, eval_);
    case "keyed-array":
      return mergeKeyedArray(rl, config, golden, eval_);
    case "set":
      return mergeSet(rl, config, golden, eval_);
    case "ordered-array":
      return mergeOrderedArray(rl, config, golden, eval_);
  }
}

async function mergeScalar(
  rl: RLInterface,
  config: Extract<SectionConfig, { kind: "scalar" }>,
  golden: unknown,
  eval_: unknown,
): Promise<unknown> {
  const display = config.display ?? defaultDisplay;
  const choice = await askChoice(rl, config.label, display(golden), display(eval_));
  if (choice === "g") return golden;
  if (choice === "e") return eval_;
  return golden;
}

async function mergeKeyedArray(
  rl: RLInterface,
  config: Extract<SectionConfig, { kind: "keyed-array" }>,
  golden: unknown,
  eval_: unknown,
): Promise<unknown[]> {
  const gArr = asArray(golden);
  const eArr = asArray(eval_);
  const keyFn = typeof config.key === "function"
    ? config.key
    : (item: unknown) => String((item as Record<string, unknown>)[config.key as string]);
  const display = config.display ?? defaultItemDisplay;

  const gByKey = new Map<string, unknown>();
  for (const item of gArr) gByKey.set(keyFn(item), item);
  const eByKey = new Map<string, unknown>();
  for (const item of eArr) eByKey.set(keyFn(item), item);

  const allKeys = [...new Set([...gByKey.keys(), ...eByKey.keys()])].sort();

  const matching: unknown[] = [];
  const goldenOnly: Array<{ key: string; item: unknown }> = [];
  const evalOnly: Array<{ key: string; item: unknown }> = [];
  const changed: Array<{ key: string; golden: unknown; eval: unknown }> = [];

  for (const key of allKeys) {
    const gi = gByKey.get(key);
    const ei = eByKey.get(key);
    if (gi !== undefined && ei !== undefined) {
      if (deepEqual(gi, ei)) matching.push(gi);
      else changed.push({ key, golden: gi, eval: ei });
    } else if (gi !== undefined) {
      goldenOnly.push({ key, item: gi });
    } else if (ei !== undefined) {
      evalOnly.push({ key, item: ei });
    }
  }

  const summary = `${gArr.length} golden, ${eArr.length} eval (${matching.length} match, ${goldenOnly.length} golden-only, ${evalOnly.length} eval-only, ${changed.length} changed)`;

  if (goldenOnly.length === 0 && evalOnly.length === 0 && changed.length === 0) {
    console.log(`\n✓ ${config.label}: ${matching.length} match, no diffs`);
    return [...matching];
  }

  const choice = await askSection(rl, config.label, summary);

  if (choice === "g") return [...gArr];
  if (choice === "e") return [...eArr];
  if (choice === "b") return [...matching, ...goldenOnly.map((x) => x.item), ...evalOnly.map((x) => x.item), ...changed.map((x) => x.golden)];

  const result = [...matching];

  if (goldenOnly.length > 0) {
    console.log(`  Golden-only (${goldenOnly.length}):`);
    for (const { key, item } of goldenOnly) {
      const keep = await askKeep(rl, `${key}: ${display(item)}`);
      if (keep) result.push(item);
    }
  }

  if (evalOnly.length > 0) {
    console.log(`  Eval-only (${evalOnly.length}):`);
    for (const { key, item } of evalOnly) {
      const keep = await askKeep(rl, `${key}: ${display(item)}`);
      if (keep) result.push(item);
    }
  }

  if (changed.length > 0) {
    console.log(`  Changed (${changed.length}):`);
    for (const { key, golden: gi, eval: ei } of changed) {
      const c = await askChoice(rl, key, display(gi), display(ei));
      if (c === "g") result.push(gi);
      else if (c === "e") result.push(ei);
    }
  }

  return result;
}

async function mergeSet(
  rl: RLInterface,
  config: Extract<SectionConfig, { kind: "set" }>,
  golden: unknown,
  eval_: unknown,
): Promise<unknown[]> {
  const gArr = asArray(golden);
  const eArr = asArray(eval_);
  const identity = config.identity ?? ((item: unknown) => typeof item === "string" ? item : JSON.stringify(item));
  const display = config.display ?? defaultItemDisplay;

  const gSet = new Map<string, unknown>();
  for (const item of gArr) gSet.set(identity(item), item);
  const eSet = new Map<string, unknown>();
  for (const item of eArr) eSet.set(identity(item), item);

  const matching: unknown[] = [];
  const goldenOnly: Array<{ id: string; item: unknown }> = [];
  const evalOnly: Array<{ id: string; item: unknown }> = [];

  for (const [id, item] of gSet) {
    if (eSet.has(id)) matching.push(item);
    else goldenOnly.push({ id, item });
  }
  for (const [id, item] of eSet) {
    if (!gSet.has(id)) evalOnly.push({ id, item });
  }

  const summary = `${gArr.length} golden, ${eArr.length} eval (${matching.length} match, ${goldenOnly.length} golden-only, ${evalOnly.length} eval-only)`;

  if (goldenOnly.length === 0 && evalOnly.length === 0) {
    console.log(`\n✓ ${config.label}: ${matching.length} match, no diffs`);
    return [...matching];
  }

  const choice = await askSection(rl, config.label, summary);

  if (choice === "g") return [...gArr];
  if (choice === "e") return [...eArr];
  if (choice === "b") return [...matching, ...goldenOnly.map((x) => x.item), ...evalOnly.map((x) => x.item)];

  const result = [...matching];

  if (goldenOnly.length > 0) {
    console.log(`  Golden-only (${goldenOnly.length}):`);
    for (const { item } of goldenOnly) {
      const keep = await askKeep(rl, display(item));
      if (keep) result.push(item);
    }
  }

  if (evalOnly.length > 0) {
    console.log(`  Eval-only (${evalOnly.length}):`);
    for (const { item } of evalOnly) {
      const keep = await askKeep(rl, display(item));
      if (keep) result.push(item);
    }
  }

  return result;
}

async function mergeOrderedArray(
  rl: RLInterface,
  config: Extract<SectionConfig, { kind: "ordered-array" }>,
  golden: unknown,
  eval_: unknown,
): Promise<unknown[]> {
  const gArr = asArray(golden);
  const eArr = asArray(eval_);
  const display = config.display ?? defaultItemDisplay;

  const summary = `${gArr.length} golden, ${eArr.length} eval`;
  const choice = await askSection(rl, config.label, summary);

  if (choice === "g") return [...gArr];
  if (choice === "e") return [...eArr];
  if (choice === "b") {
    console.log("  (using golden order for 'both')");
    return [...gArr];
  }

  const result: unknown[] = [];
  const maxLen = Math.max(gArr.length, eArr.length);

  for (let i = 0; i < maxLen; i++) {
    const gi = gArr[i];
    const ei = eArr[i];

    if (gi !== undefined && ei !== undefined) {
      if (deepEqual(gi, ei)) {
        result.push(gi);
      } else {
        const c = await askChoice(rl, `[${i}]`, display(gi), display(ei));
        if (c === "g") result.push(gi);
        else if (c === "e") result.push(ei);
      }
    } else if (gi !== undefined) {
      const keep = await askKeep(rl, `[${i}]: ${display(gi)} (golden-only)`);
      if (keep) result.push(gi);
    } else if (ei !== undefined) {
      const keep = await askKeep(rl, `[${i}]: ${display(ei)} (eval-only)`);
      if (keep) result.push(ei);
    }
  }

  return result;
}

// ─── Auto merge (no schema) ──────────────────────────────────────────

async function autoMerge(
  rl: RLInterface,
  golden: unknown,
  eval_: unknown,
): Promise<unknown> {
  if (!isObject(golden) || !isObject(eval_)) {
    const choice = await askChoice(rl, "root", defaultDisplay(golden), defaultDisplay(eval_));
    return choice === "e" ? eval_ : golden;
  }

  const result: Record<string, unknown> = { ...golden };
  const allKeys = [...new Set([...Object.keys(golden), ...Object.keys(eval_)])].sort();

  for (const key of allKeys) {
    const gVal = golden[key];
    const eVal = eval_[key];

    if (deepEqual(gVal, eVal)) {
      continue;
    }

    if (Array.isArray(gVal) || Array.isArray(eVal)) {
      const gArr = Array.isArray(gVal) ? gVal : [];
      const eArr = Array.isArray(eVal) ? eVal : [];
      const summary = `${gArr.length} golden, ${eArr.length} eval`;
      const choice = await askSection(rl, key, summary);

      if (choice === "g") result[key] = gVal;
      else if (choice === "e") result[key] = eVal;
      else if (choice === "b") {
        const gSet = new Set(gArr.map((x: unknown) => JSON.stringify(x)));
        const combined = [...gArr];
        for (const item of eArr) {
          if (!gSet.has(JSON.stringify(item))) combined.push(item);
        }
        result[key] = combined;
      } else {
        const merged: unknown[] = [];
        const gSet = new Set(gArr.map((x: unknown) => JSON.stringify(x)));
        const eSet = new Set(eArr.map((x: unknown) => JSON.stringify(x)));

        for (const item of gArr) {
          if (eSet.has(JSON.stringify(item))) {
            merged.push(item);
          } else {
            const keep = await askKeep(rl, `${defaultItemDisplay(item)} (golden-only)`);
            if (keep) merged.push(item);
          }
        }
        for (const item of eArr) {
          if (!gSet.has(JSON.stringify(item))) {
            const keep = await askKeep(rl, `${defaultItemDisplay(item)} (eval-only)`);
            if (keep) merged.push(item);
          }
        }
        result[key] = merged;
      }
    } else if (isObject(gVal) && isObject(eVal)) {
      console.log(`\n── ${key} ──────────────────────────────────────────────`);
      result[key] = await autoMerge(rl, gVal, eVal);
    } else {
      const choice = await askChoice(rl, key, defaultDisplay(gVal), defaultDisplay(eVal));
      if (choice === "g") result[key] = gVal;
      else if (choice === "e") result[key] = eVal;
    }
  }

  return result;
}

// ─── Utilities ───────────────────────────────────────────────────────

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || !isObject(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
}

function asArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  return [val];
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
  if (isObject(item)) {
    const entries = Object.entries(item);
    const parts: string[] = [];
    for (const [k, v] of entries) {
      if (Array.isArray(v) || isObject(v)) continue;
      if (v === undefined || v === null) continue;
      parts.push(`${k}: ${v}`);
      if (parts.length >= 3) break;
    }
    return parts.join(", ");
  }
  return JSON.stringify(item);
}
