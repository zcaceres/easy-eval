import { describe, test, expect } from "bun:test";
import { fuzzyMatch } from "./fuzzyMatch";
import type { EvalRun, Golden, EvalDef, EvalVerdict } from "../types";

function makeRun(output: unknown): EvalRun {
  return {
    timestamp: "2025-01-01T00:00:00.000Z",
    datasetId: "test-dataset",
    worker: "default",
    durationMs: 100,
    output,
  };
}

function makeGolden(output: unknown): Golden {
  return {
    blessedAt: "2025-01-01T00:00:00.000Z",
    datasetId: "test-dataset",
    worker: "default",
    output,
  };
}

function makeEvalDef(): EvalDef {
  return { eval: async () => ({}) };
}

describe("fuzzyMatch", () => {
  test("returns a function (factory pattern)", () => {
    const judge = fuzzyMatch();
    expect(typeof judge).toBe("function");
  });

  test("pass=true when no golden exists", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ name: "foo" }),
      golden: null,
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
    expect(verdict.summary).toContain("no golden");
  });

  test("pass=true when outputs are identical", async () => {
    const output = { name: "Alice", score: 95 };
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun(output),
      golden: makeGolden(output),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("ignores case by default", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ name: "ALICE" }),
      golden: makeGolden({ name: "alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("respects case when ignoreCase=false", async () => {
    const judge = fuzzyMatch({ ignoreCase: false });
    const verdict = await judge({
      run: makeRun({ name: "ALICE" }),
      golden: makeGolden({ name: "alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("ignores whitespace differences by default", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ name: "  Alice   Bob  " }),
      golden: makeGolden({ name: "Alice Bob" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("respects whitespace when ignoreWhitespace=false", async () => {
    const judge = fuzzyMatch({ ignoreWhitespace: false });
    const verdict = await judge({
      run: makeRun({ name: "  Alice  " }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("passes numbers within tolerance", async () => {
    const judge = fuzzyMatch({ numericTolerance: 0.1 });
    const verdict = await judge({
      run: makeRun({ score: 95 }),
      golden: makeGolden({ score: 100 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("fails numbers outside tolerance", async () => {
    const judge = fuzzyMatch({ numericTolerance: 0.01 });
    const verdict = await judge({
      run: makeRun({ score: 50 }),
      golden: makeGolden({ score: 100 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toContain("score");
  });

  test("default numeric tolerance is 0 (exact)", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ score: 95 }),
      golden: makeGolden({ score: 100 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("checks only specified fields", async () => {
    const judge = fuzzyMatch({ fields: ["name"] });
    const verdict = await judge({
      run: makeRun({ name: "alice", score: 0 }),
      golden: makeGolden({ name: "Alice", score: 100 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("pass=false when field is missing", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ name: "Alice" }),
      golden: makeGolden({ name: "Alice", score: 95 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("handles arrays (set comparison by default)", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ tags: ["b", "a"] }),
      golden: makeGolden({ tags: ["a", "b"] }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("summary lists mismatched fields", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ name: "Alice", score: 50, rating: 3 }),
      golden: makeGolden({ name: "Alice", score: 100, rating: 5 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toContain("score");
    expect(verdict.summary).toContain("rating");
  });

  // ─── Levenshtein / similarity ──────────────────────────────────

  test("passes strings within maxEditDistance", async () => {
    const judge = fuzzyMatch({ maxEditDistance: 2, ignoreCase: false });
    const verdict = await judge({
      run: makeRun({ name: "Alce" }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("fails strings beyond maxEditDistance", async () => {
    const judge = fuzzyMatch({ maxEditDistance: 1, ignoreCase: false });
    const verdict = await judge({
      run: makeRun({ name: "Bob" }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("passes strings above minSimilarity", async () => {
    const judge = fuzzyMatch({ minSimilarity: 0.8, ignoreCase: false });
    const verdict = await judge({
      run: makeRun({ name: "Alica" }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("fails strings below minSimilarity", async () => {
    const judge = fuzzyMatch({ minSimilarity: 0.95, ignoreCase: false });
    const verdict = await judge({
      run: makeRun({ name: "Alica" }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("passes if either maxEditDistance or minSimilarity is satisfied", async () => {
    const judge = fuzzyMatch({ maxEditDistance: 1, minSimilarity: 0.5, ignoreCase: false });
    // "Alica" vs "Alice": edit distance = 1, similarity = 0.8
    // maxEditDistance=1 is satisfied, so it passes even though minSimilarity alone would also pass
    const verdict = await judge({
      run: makeRun({ name: "Alica" }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("fails if neither maxEditDistance nor minSimilarity is satisfied", async () => {
    const judge = fuzzyMatch({ maxEditDistance: 1, minSimilarity: 0.99, ignoreCase: false });
    // "Alxyz" vs "Alice": edit distance = 3, similarity = 0.4
    const verdict = await judge({
      run: makeRun({ name: "Alxyz" }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("levenshtein applies after normalization by default", async () => {
    const judge = fuzzyMatch({ maxEditDistance: 0 });
    // "alice" vs "Alice" — after case normalization, identical, so distance=0
    const verdict = await judge({
      run: makeRun({ name: "alice" }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("levenshtein works on longer strings", async () => {
    const judge = fuzzyMatch({ minSimilarity: 0.9, ignoreCase: false });
    const verdict = await judge({
      run: makeRun({ bio: "The quick brown fox jumps over the lazy dog" }),
      golden: makeGolden({ bio: "The quick brown fox jumped over the lazy dog" }),
      evalDef: makeEvalDef(),
    });
    // "jumps" vs "jumped" — edit distance 2, similarity ~0.95
    expect(verdict.pass).toBe(true);
  });

  // ─── Shape conformance ────────────────────────────────────────

  test("verdict conforms to EvalVerdict shape", async () => {
    const judge = fuzzyMatch();
    const verdict: EvalVerdict = await judge({
      run: makeRun({ x: 1 }),
      golden: makeGolden({ x: 1 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict).toHaveProperty("diff");
    expect(verdict).toHaveProperty("pass");
    expect(verdict).toHaveProperty("summary");
  });

  // ─── Regression: null output and fuzzy array comparison ───────

  test("does not crash when an output is null", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun(null),
      golden: makeGolden({ a: 1 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("array elements honor fuzzy options (case + whitespace, order-insensitive)", async () => {
    const judge = fuzzyMatch({ ignoreCase: true, ignoreWhitespace: true });
    const verdict = await judge({
      run: makeRun({ tags: ["hello  world", "foo"] }),
      golden: makeGolden({ tags: ["Foo", "Hello World"] }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("array with a genuinely different element still mismatches", async () => {
    const judge = fuzzyMatch();
    const verdict = await judge({
      run: makeRun({ tags: ["aaa"] }),
      golden: makeGolden({ tags: ["zzz"] }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });
});
