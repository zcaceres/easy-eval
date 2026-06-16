import type { EvalMethod } from "../types";

export interface ExactMatchOptions {
  fields?: string[];
}

export function exactMatch(options?: ExactMatchOptions): EvalMethod {
  const fields = options?.fields;

  return async ({ run, golden }) => {
    if (!golden) {
      return { diff: null, pass: true, summary: "no golden to compare against" };
    }

    const goldenObj = golden.output as Record<string, unknown>;
    const runObj = run.output as Record<string, unknown>;

    if (typeof goldenObj !== "object" || goldenObj === null || typeof runObj !== "object" || runObj === null) {
      const pass = JSON.stringify(golden.output) === JSON.stringify(run.output);
      return { diff: null, pass, summary: pass ? "exact match" : "mismatch" };
    }

    const keysToCheck = fields ?? allKeys(goldenObj, runObj);
    const mismatched: string[] = [];

    for (const key of keysToCheck) {
      const g = JSON.stringify((goldenObj as Record<string, unknown>)[key]);
      const r = JSON.stringify((runObj as Record<string, unknown>)[key]);
      if (g !== r) mismatched.push(key);
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

function allKeys(...objs: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const obj of objs) {
    if (obj && typeof obj === "object") {
      for (const k of Object.keys(obj)) keys.add(k);
    }
  }
  return [...keys];
}
