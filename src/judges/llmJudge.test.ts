import { describe, test, expect } from "bun:test";
import { llmJudge } from "./llmJudge";
import type { EvalRun, Golden, EvalDef } from "../types";

function makeGolden(output: unknown): Golden {
  return { blessedAt: "2025-01-01T00:00:00.000Z", datasetId: "test", worker: "default", output };
}

function makeRun(output: unknown): EvalRun {
  return { timestamp: "2025-01-01T00:00:01.000Z", datasetId: "test", worker: "default", durationMs: 100, output };
}

const evalDef: EvalDef = { eval: async () => ({}) };

describe("llmJudge", () => {
  test("returns factory function (EvalMethod)", () => {
    const judge = llmJudge({ call: async () => '{"pass": true, "summary": "ok"}' });
    expect(typeof judge).toBe("function");
  });

  test("passes when LLM returns pass: true", async () => {
    const judge = llmJudge({
      call: async () => '{"pass": true, "summary": "looks good"}',
    });
    const verdict = await judge({ run: makeRun({ a: 1 }), golden: makeGolden({ a: 1 }), evalDef });
    expect(verdict.pass).toBe(true);
    expect(verdict.summary).toBe("looks good");
  });

  test("fails when LLM returns pass: false", async () => {
    const judge = llmJudge({
      call: async () => '{"pass": false, "summary": "missing field X"}',
    });
    const verdict = await judge({ run: makeRun({ a: 1 }), golden: makeGolden({ a: 1, b: 2 }), evalDef });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toBe("missing field X");
  });

  test("no golden — still calls LLM and returns verdict", async () => {
    const judge = llmJudge({
      call: async () => '{"pass": true, "summary": "output looks reasonable"}',
    });
    const verdict = await judge({ run: makeRun({ a: 1 }), golden: null, evalDef });
    expect(verdict.pass).toBe(true);
  });

  test("includes rubric in prompt", async () => {
    let capturedPrompt = "";
    const judge = llmJudge({
      call: async (prompt) => {
        capturedPrompt = prompt;
        return '{"pass": true, "summary": "ok"}';
      },
      rubric: "All fields must be present",
    });
    await judge({ run: makeRun({ a: 1 }), golden: makeGolden({ a: 1 }), evalDef });
    expect(capturedPrompt).toContain("All fields must be present");
  });

  test("includes golden and run output in prompt", async () => {
    let capturedPrompt = "";
    const judge = llmJudge({
      call: async (prompt) => {
        capturedPrompt = prompt;
        return '{"pass": true, "summary": "ok"}';
      },
    });
    await judge({ run: makeRun({ score: 42 }), golden: makeGolden({ score: 99 }), evalDef });
    expect(capturedPrompt).toContain('"score": 42');
    expect(capturedPrompt).toContain('"score": 99');
    expect(capturedPrompt).toContain("Golden");
    expect(capturedPrompt).toContain("Run");
  });

  test("omits golden section from prompt when no golden", async () => {
    let capturedPrompt = "";
    const judge = llmJudge({
      call: async (prompt) => {
        capturedPrompt = prompt;
        return '{"pass": true, "summary": "ok"}';
      },
    });
    await judge({ run: makeRun({ a: 1 }), golden: null, evalDef });
    expect(capturedPrompt).not.toContain("Golden");
  });

  test("stores raw LLM response in metadata", async () => {
    const raw = '{"pass": true, "summary": "fine"}';
    const judge = llmJudge({ call: async () => raw });
    const verdict = await judge({ run: makeRun({}), golden: null, evalDef });
    expect(verdict.metadata?.rawResponse).toBe(raw);
  });

  test("diff is always null", async () => {
    const judge = llmJudge({ call: async () => '{"pass": true, "summary": "ok"}' });
    const verdict = await judge({ run: makeRun({}), golden: makeGolden({}), evalDef });
    expect(verdict.diff).toBeNull();
  });

  test("handles LLM returning JSON with surrounding text", async () => {
    const judge = llmJudge({
      call: async () => 'Here is my verdict: {"pass": false, "summary": "bad output"} Hope this helps!',
    });
    const verdict = await judge({ run: makeRun({}), golden: makeGolden({}), evalDef });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toBe("bad output");
  });

  test("fails gracefully when LLM returns non-JSON", async () => {
    const judge = llmJudge({
      call: async () => "I think the output looks fine",
    });
    const verdict = await judge({ run: makeRun({}), golden: makeGolden({}), evalDef });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toContain("failed to parse");
  });

  test("fails gracefully when LLM returns JSON without pass field", async () => {
    const judge = llmJudge({
      call: async () => '{"verdict": "good", "summary": "ok"}',
    });
    const verdict = await judge({ run: makeRun({}), golden: makeGolden({}), evalDef });
    expect(verdict.pass).toBe(false);
    expect(verdict.summary).toContain('missing "pass" field');
  });

  test("handles missing summary field in LLM response", async () => {
    const judge = llmJudge({
      call: async () => '{"pass": true}',
    });
    const verdict = await judge({ run: makeRun({}), golden: null, evalDef });
    expect(verdict.pass).toBe(true);
    expect(typeof verdict.summary).toBe("string");
  });

  test("returns valid EvalVerdict shape", async () => {
    const judge = llmJudge({ call: async () => '{"pass": true, "summary": "ok"}' });
    const verdict = await judge({ run: makeRun({}), golden: makeGolden({}), evalDef });
    expect(verdict).toHaveProperty("pass");
    expect(verdict).toHaveProperty("summary");
    expect(verdict).toHaveProperty("diff");
    expect(typeof verdict.pass).toBe("boolean");
    expect(typeof verdict.summary).toBe("string");
  });
});
