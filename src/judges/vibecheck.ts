import type { EvalMethod, DiffSchema, EvalDef } from "../types";
import { diff } from "../diff/index";

export interface VibecheckOptions {
  schema?: DiffSchema;
}

export function vibecheck(options?: VibecheckOptions): EvalMethod {
  const schema = options?.schema;

  return async ({ run, golden }) => {
    if (!golden) {
      return { diff: null, pass: true, summary: "no golden to compare against" };
    }

    const result = diff(golden.output, run.output, schema);
    const { matches, changed, missing, new: added } = result.summary;
    const pass = changed === 0 && missing === 0 && added === 0;

    const parts: string[] = [];
    if (matches > 0) parts.push(`${matches} match`);
    if (changed > 0) parts.push(`${changed} changed`);
    if (missing > 0) parts.push(`${missing} missing`);
    if (added > 0) parts.push(`${added} new`);

    return {
      diff: result,
      pass,
      summary: parts.join(", "),
    };
  };
}

/**
 * Resolve the judge for an eval. Uses the eval's explicit `judge` if set,
 * otherwise falls back to the default `vibecheck()` judge — plumbing the
 * eval's `diffSchema` through so schema-driven diffing works without the
 * user having to wire `judge: vibecheck({ schema })` by hand.
 */
export function resolveJudge(evalDef: EvalDef): EvalMethod {
  return evalDef.judge ?? vibecheck({ schema: evalDef.diffSchema });
}
