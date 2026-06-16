import { describe, test, expect } from "bun:test";
import { exactMatch } from "./exactMatch";
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

describe("exactMatch", () => {
  test("returns a function (factory pattern)", () => {
    const judge = exactMatch();
    expect(typeof judge).toBe("function");
  });

  test("pass=true when no golden exists", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun({ name: "foo" }),
      golden: null,
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
    expect(verdict.summary).toContain("no golden");
  });

  test("pass=true when outputs are identical", async () => {
    const output = { name: "Alice", score: 95, tags: ["a", "b"] };
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun(output),
      golden: makeGolden(output),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("pass=false when a field differs", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun({ name: "Bob", score: 95 }),
      golden: makeGolden({ name: "Alice", score: 95 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toContain("name");
  });

  test("pass=false when field is missing from output", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun({ name: "Alice" }),
      golden: makeGolden({ name: "Alice", score: 95 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("pass=false when output has extra fields not in golden", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun({ name: "Alice", score: 95 }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("checks only specified fields when fields option is set", async () => {
    const judge = exactMatch({ fields: ["name"] });
    const verdict = await judge({
      run: makeRun({ name: "Alice", score: 50 }),
      golden: makeGolden({ name: "Alice", score: 95 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("fails on specified field even when others match", async () => {
    const judge = exactMatch({ fields: ["score"] });
    const verdict = await judge({
      run: makeRun({ name: "Alice", score: 50 }),
      golden: makeGolden({ name: "Alice", score: 95 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toContain("score");
  });

  test("handles nested objects", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun({ meta: { a: 1, b: 2 } }),
      golden: makeGolden({ meta: { a: 1, b: 2 } }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("handles arrays with order sensitivity", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun({ tags: ["b", "a"] }),
      golden: makeGolden({ tags: ["a", "b"] }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("handles primitive outputs", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun("hello"),
      golden: makeGolden("hello"),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });

  test("verdict conforms to EvalVerdict shape", async () => {
    const judge = exactMatch();
    const verdict: EvalVerdict = await judge({
      run: makeRun({ x: 1 }),
      golden: makeGolden({ x: 1 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict).toHaveProperty("diff");
    expect(verdict).toHaveProperty("pass");
    expect(verdict).toHaveProperty("summary");
  });

  // ─── Regression: scalar/null output handling ──────────────────

  test("does not crash when run output is null", async () => {
    const judge = exactMatch();
    const verdict = await judge({
      run: makeRun(null),
      golden: makeGolden({ a: 1 }),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("differing scalar outputs mismatch even when fields are set", async () => {
    const judge = exactMatch({ fields: ["a"] });
    const verdict = await judge({
      run: makeRun("world"),
      golden: makeGolden("hello"),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(false);
  });

  test("equal scalar outputs match even when fields are set", async () => {
    const judge = exactMatch({ fields: ["a"] });
    const verdict = await judge({
      run: makeRun("hello"),
      golden: makeGolden("hello"),
      evalDef: makeEvalDef(),
    });
    expect(verdict.pass).toBe(true);
  });
});
