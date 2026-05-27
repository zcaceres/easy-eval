import type { EvalMethod } from "../types";

export interface LlmJudgeOptions {
  call: (prompt: string) => Promise<string>;
  rubric?: string;
}

export function llmJudge(options: LlmJudgeOptions): EvalMethod {
  const { call, rubric } = options;

  return async ({ run, golden }) => {
    const prompt = buildPrompt(run.output, golden?.output ?? null, rubric);
    const raw = await call(prompt);
    const parsed = parseResponse(raw);

    return {
      diff: null,
      pass: parsed.pass,
      summary: parsed.summary,
      metadata: { rawResponse: raw },
    };
  };
}

function buildPrompt(
  runOutput: unknown,
  goldenOutput: unknown | null,
  rubric?: string,
): string {
  const lines: string[] = [
    "You are an eval judge. Your job is to determine whether the output is correct.",
    "",
  ];

  if (rubric) {
    lines.push(`Rubric: ${rubric}`, "");
  }

  if (goldenOutput !== null) {
    lines.push(
      "Golden (reference output):",
      "```json",
      JSON.stringify(goldenOutput, null, 2),
      "```",
      "",
    );
  }

  lines.push(
    "Run (actual output):",
    "```json",
    JSON.stringify(runOutput, null, 2),
    "```",
    "",
    'Respond with ONLY a JSON object: {"pass": true/false, "summary": "one sentence explanation"}',
  );

  return lines.join("\n");
}

function parseResponse(raw: string): { pass: boolean; summary: string } {
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    return { pass: false, summary: `failed to parse LLM response: ${raw.slice(0, 200)}` };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.pass !== "boolean") {
      return { pass: false, summary: `LLM response missing "pass" field: ${raw.slice(0, 200)}` };
    }
    return {
      pass: parsed.pass,
      summary: typeof parsed.summary === "string" ? parsed.summary : String(parsed.pass),
    };
  } catch {
    return { pass: false, summary: `failed to parse LLM JSON: ${raw.slice(0, 200)}` };
  }
}
