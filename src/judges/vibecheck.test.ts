import { describe, test, expect } from "bun:test";
import { vibecheck } from "./vibecheck";
import type { EvalRun, Golden, EvalDef, EvalVerdict } from "../types";

function makeRun(output: unknown, overrides?: Partial<EvalRun>): EvalRun {
  return {
    timestamp: "2025-01-01T00:00:00.000Z",
    datasetId: "test-dataset",
    worker: "default",
    durationMs: 100,
    output,
    ...overrides,
  };
}

function makeGolden(output: unknown, overrides?: Partial<Golden>): Golden {
  return {
    blessedAt: "2025-01-01T00:00:00.000Z",
    datasetId: "test-dataset",
    worker: "default",
    output,
    ...overrides,
  };
}

function makeEvalDef(overrides?: Partial<EvalDef>): EvalDef {
  return {
    eval: async () => ({}),
    ...overrides,
  };
}

describe("vibecheck", () => {
  test("returns a function (factory pattern)", () => {
    const judge = vibecheck();
    expect(typeof judge).toBe("function");
  });

  test("pass=true when no golden exists", async () => {
    const judge = vibecheck();
    const verdict = await judge({
      run: makeRun({ name: "foo" }),
      golden: null,
      evalDef: makeEvalDef(),
    });

    expect(verdict.pass).toBe(true);
    expect(verdict.diff).toBeNull();
    expect(verdict.summary).toContain("no golden");
  });

  test("pass=true with identical output", async () => {
    const output = { name: "Alice", tags: ["a", "b"] };
    const judge = vibecheck();
    const verdict = await judge({
      run: makeRun(output),
      golden: makeGolden(output),
      evalDef: makeEvalDef(),
    });

    expect(verdict.pass).toBe(true);
    expect(verdict.diff).not.toBeNull();
    expect(verdict.diff!.summary.changed).toBe(0);
    expect(verdict.diff!.summary.missing).toBe(0);
    expect(verdict.diff!.summary.new).toBe(0);
  });

  test("pass=false when output differs from golden", async () => {
    const judge = vibecheck();
    const verdict = await judge({
      run: makeRun({ name: "Bob", score: 10 }),
      golden: makeGolden({ name: "Alice", score: 10 }),
      evalDef: makeEvalDef(),
    });

    expect(verdict.pass).toBe(false);
    expect(verdict.diff).not.toBeNull();
    expect(verdict.diff!.summary.changed).toBeGreaterThan(0);
  });

  test("pass=false when golden has fields missing from output", async () => {
    const judge = vibecheck();
    const verdict = await judge({
      run: makeRun({ name: "Alice" }),
      golden: makeGolden({ name: "Alice", score: 10 }),
      evalDef: makeEvalDef(),
    });

    expect(verdict.pass).toBe(false);
    expect(verdict.diff!.summary.missing).toBeGreaterThan(0);
  });

  test("pass=false when output has new fields not in golden", async () => {
    const judge = vibecheck();
    const verdict = await judge({
      run: makeRun({ name: "Alice", score: 10 }),
      golden: makeGolden({ name: "Alice" }),
      evalDef: makeEvalDef(),
    });

    expect(verdict.pass).toBe(false);
    expect(verdict.diff!.summary.new).toBeGreaterThan(0);
  });

  test("uses schema when provided to vibecheck()", async () => {
    const judge = vibecheck({
      schema: {
        sections: [
          { kind: "scalar", path: "name", label: "Name" },
          { kind: "keyed-array", path: "items", label: "Items", key: "id" },
        ],
      },
    });
    const verdict = await judge({
      run: makeRun({ name: "Bob", items: [{ id: "1", val: "x" }] }),
      golden: makeGolden({ name: "Alice", items: [{ id: "1", val: "y" }] }),
      evalDef: makeEvalDef(),
    });

    expect(verdict.pass).toBe(false);
    expect(verdict.diff).not.toBeNull();
    expect(verdict.diff!.sections.length).toBe(2);
    expect(verdict.diff!.sections[0]!.label).toBe("Name");
    expect(verdict.diff!.sections[1]!.label).toBe("Items");
  });

  test("summary includes match/change counts", async () => {
    const judge = vibecheck();
    const verdict = await judge({
      run: makeRun({ a: 1, b: 2 }),
      golden: makeGolden({ a: 1, b: 99 }),
      evalDef: makeEvalDef(),
    });

    expect(verdict.summary).toMatch(/\d/);
    expect(verdict.summary.length).toBeGreaterThan(0);
  });

  test("verdict conforms to EvalVerdict shape", async () => {
    const judge = vibecheck();
    const verdict: EvalVerdict = await judge({
      run: makeRun({ x: 1 }),
      golden: makeGolden({ x: 1 }),
      evalDef: makeEvalDef(),
    });

    expect(verdict).toHaveProperty("diff");
    expect(verdict).toHaveProperty("pass");
    expect(verdict).toHaveProperty("summary");
  });
});
