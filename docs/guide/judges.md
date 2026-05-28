# Judges

A **judge** determines pass/fail for an eval run. Set `judge` on your eval definition — if omitted, `vibecheck()` is used by default.

All built-in judges share the `EvalMethod` signature: `(JudgeInput) => Promise<EvalVerdict>`. You can write your own by implementing that interface.

## `vibecheck()`

The default. Diffs eval output against golden and passes when nothing changed, went missing, or was added. Without a schema it auto-diffs JSON recursively. Pass a schema for structured section-by-section diffs:

```ts
import { defineConfig, vibecheck } from "easy-eval";

export default defineConfig({
  evals: {
    default: {
      eval: async (ctx) => { /* ... */ },
      judge: vibecheck({
        schema: {
          sections: [
            { path: "title", label: "Title", kind: "scalar" },
            { path: "items", label: "Items", kind: "keyed-array", key: "id" },
          ],
        },
      }),
    },
  },
});
```

Section kinds: `scalar`, `keyed-array`, `set`, `ordered-array`.

## `exactMatch()`

Deterministic. Deep-equals run output against golden. Passes only when values are identical. Use `fields` to restrict to specific top-level keys:

```ts
import { exactMatch } from "easy-eval";

judge: exactMatch({ fields: ["name", "status"] });
```

## `fuzzyMatch()`

Flexible comparison with normalization. Configurable tolerance for strings (case, whitespace, edit distance) and numbers:

```ts
import { fuzzyMatch } from "easy-eval";

judge: fuzzyMatch({
  ignoreCase: true,          // default: true
  ignoreWhitespace: true,    // default: true
  numericTolerance: 0.1,     // ±10% of golden value
  maxEditDistance: 3,        // Levenshtein threshold
  minSimilarity: 0.9,        // normalized similarity ratio (0–1)
  fields: ["name", "score"], // optional: restrict to these keys
});
```

String matching: normalization first, then exact comparison. If still different and `maxEditDistance` or `minSimilarity` is set, Levenshtein distance is checked — passing either threshold is enough. Arrays compared as sets.

## `llmJudge()`

LLM-as-judge. You provide a `call` function that takes a prompt and returns a string. The judge constructs a grading prompt from the run output, golden, and an optional rubric, then parses the LLM's JSON response:

```ts
import { llmJudge } from "easy-eval";

judge: llmJudge({
  call: async (prompt) => {
    return await myLlm(prompt); // any provider, any SDK
  },
  rubric: "All required fields must be present and accurate",
});
```

The LLM is prompted to return `{"pass": true/false, "summary": "..."}`. Raw response is stored in `verdict.metadata.rawResponse`. Unparseable responses default to `pass: false`.

## Writing a custom judge

A judge is just a function. Here's a minimal one that passes when the output's `score` exceeds a threshold:

```ts
import type { EvalMethod } from "easy-eval";

const scoreThreshold = (min: number): EvalMethod => async ({ run }) => ({
  pass: (run.output as any).score >= min,
  summary: `score=${(run.output as any).score} (threshold=${min})`,
  diff: { sections: [], summary: "" },
});

// ...
judge: scoreThreshold(0.8),
```

See the [API Reference](/api/) for the full `EvalMethod`, `JudgeInput`, and `EvalVerdict` type definitions.
