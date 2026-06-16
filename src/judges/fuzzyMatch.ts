import type { EvalMethod } from "../types";

export interface FuzzyMatchOptions {
  fields?: string[];
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
  numericTolerance?: number;
  maxEditDistance?: number;
  minSimilarity?: number;
}

export function fuzzyMatch(options?: FuzzyMatchOptions): EvalMethod {
  const {
    fields,
    ignoreCase = true,
    ignoreWhitespace = true,
    numericTolerance = 0,
    maxEditDistance,
    minSimilarity,
  } = options ?? {};

  return async ({ run, golden }) => {
    if (!golden) {
      return { diff: null, pass: true, summary: "no golden to compare against" };
    }

    const goldenObj = golden.output as Record<string, unknown>;
    const runObj = run.output as Record<string, unknown>;

    if (typeof goldenObj !== "object" || goldenObj === null || typeof runObj !== "object" || runObj === null) {
      const pass = fuzzyEqual(golden.output, run.output, {
        ignoreCase,
        ignoreWhitespace,
        numericTolerance,
        maxEditDistance,
        minSimilarity,
      });
      return { diff: null, pass, summary: pass ? "fuzzy match" : "mismatch" };
    }

    const keysToCheck = fields ?? allKeys(goldenObj, runObj);
    const mismatched: string[] = [];

    for (const key of keysToCheck) {
      const gVal = (goldenObj as Record<string, unknown>)[key];
      const rVal = (runObj as Record<string, unknown>)[key];
      if (!fuzzyEqual(gVal, rVal, { ignoreCase, ignoreWhitespace, numericTolerance, maxEditDistance, minSimilarity })) {
        mismatched.push(key);
      }
    }

    if (!fields) {
      const goldenKeys = new Set(Object.keys(goldenObj as Record<string, unknown>));
      const runKeys = new Set(Object.keys(runObj as Record<string, unknown>));
      for (const k of runKeys) {
        if (!goldenKeys.has(k) && !mismatched.includes(k)) mismatched.push(k);
      }
    }

    const pass = mismatched.length === 0;
    const summary = pass
      ? `all ${keysToCheck.length} fields match`
      : `${mismatched.length} mismatch: ${mismatched.join(", ")}`;

    return { diff: null, pass, summary };
  };
}

interface CompareOpts {
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
  numericTolerance: number;
  maxEditDistance?: number;
  minSimilarity?: number;
}

function fuzzyEqual(golden: unknown, run: unknown, opts: CompareOpts): boolean {
  if (golden === undefined && run === undefined) return true;
  if (golden === undefined || run === undefined) return false;
  if (golden === null && run === null) return true;
  if (golden === null || run === null) return false;

  if (typeof golden === "number" && typeof run === "number") {
    if (golden === run) return true;
    if (opts.numericTolerance === 0) return false;
    const ref = Math.abs(golden) || 1;
    return Math.abs(golden - run) / ref <= opts.numericTolerance;
  }

  if (typeof golden === "string" && typeof run === "string") {
    let g = golden;
    let r = run;
    if (opts.ignoreWhitespace) {
      g = g.trim().replace(/\s+/g, " ");
      r = r.trim().replace(/\s+/g, " ");
    }
    if (opts.ignoreCase) {
      g = g.toLowerCase();
      r = r.toLowerCase();
    }
    if (g === r) return true;

    if (opts.maxEditDistance != null || opts.minSimilarity != null) {
      const dist = levenshtein(g, r);
      if (opts.maxEditDistance != null && dist <= opts.maxEditDistance) return true;
      if (opts.minSimilarity != null) {
        const maxLen = Math.max(g.length, r.length);
        const similarity = maxLen === 0 ? 1 : 1 - dist / maxLen;
        if (similarity >= opts.minSimilarity) return true;
      }
    }

    return false;
  }

  if (typeof golden === "boolean" && typeof run === "boolean") {
    return golden === run;
  }

  if (Array.isArray(golden) && Array.isArray(run)) {
    return fuzzyArrayEqual(golden, run, opts);
  }

  if (typeof golden === "object" && typeof run === "object") {
    const gObj = golden as Record<string, unknown>;
    const rObj = run as Record<string, unknown>;
    const keys = allKeys(gObj, rObj);
    return keys.every((k) => fuzzyEqual(gObj[k], rObj[k], opts));
  }

  return JSON.stringify(golden) === JSON.stringify(run);
}

function fuzzyArrayEqual(golden: unknown[], run: unknown[], opts: CompareOpts): boolean {
  if (golden.length !== run.length) return false;

  // Order-insensitive: greedily pair each golden element with an unused run
  // element that fuzzy-matches it, honoring the fuzzy options.
  const used = new Array(run.length).fill(false);
  for (const g of golden) {
    const idx = run.findIndex((r, i) => !used[i] && fuzzyEqual(g, r, opts));
    if (idx === -1) return false;
    used[idx] = true;
  }
  return true;
}

function allKeys(...objs: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const obj of objs) {
    if (obj && typeof obj === "object") {
      for (const k of Object.keys(obj)) keys.add(k);
    }
  }
  return [...keys];
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
