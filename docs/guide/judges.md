# Judges

A **judge** determines pass/fail for an eval run. Set `judge` on your eval definition — if omitted, `vibecheck()` is used by default.

All built-in judges share the `EvalMethod` signature: `(JudgeInput) => Promise<EvalVerdict>`. You can write your own by implementing that interface.

## `vibecheck()`

The default. Diffs eval output against golden and passes when nothing changed, went missing, or was added. Without a schema it auto-diffs JSON recursively. Pass a schema for structured section-by-section diffs:

```ts
import { defineConfig, vibecheck } from "@zcaceres/vibecheck";

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

### Section kinds

<div class="vc-sectionkinds">
  <div class="vc-sectionkind">
    <div class="vc-sectionkind-name red">scalar</div>
    <div class="vc-sectionkind-body">
      <div class="vc-sectionkind-lead">One value, compared by deep equality.</div>
      <div class="vc-sectionkind-detail">Best for single strings, numbers, booleans, or whole objects you want to treat as one atomic field. Renders as a single before/after row in the report.</div>
    </div>
  </div>
  <div class="vc-sectionkind">
    <div class="vc-sectionkind-name cyan">keyed-array</div>
    <div class="vc-sectionkind-body">
      <div class="vc-sectionkind-lead">Array of objects matched by a stable key.</div>
      <div class="vc-sectionkind-detail">Provide <code>key: "id"</code> (or any field). Diff aligns rows by that key, so reordered or renamed entries are tracked rather than treated as deletions + insertions.</div>
    </div>
  </div>
  <div class="vc-sectionkind">
    <div class="vc-sectionkind-name ochre">set</div>
    <div class="vc-sectionkind-body">
      <div class="vc-sectionkind-lead">Unordered collection of primitives.</div>
      <div class="vc-sectionkind-detail">Order-insensitive. Reports added and removed items, ignores reshuffling. Right pick for tags, labels, enabled flags, or any list where position is incidental.</div>
    </div>
  </div>
  <div class="vc-sectionkind">
    <div class="vc-sectionkind-name pink">ordered-array</div>
    <div class="vc-sectionkind-body">
      <div class="vc-sectionkind-lead">Sequence where position matters.</div>
      <div class="vc-sectionkind-detail">Index-aligned diff. A swap between positions 3 and 4 shows as two changes, not zero. Use for steps, ranked results, anything where order encodes meaning.</div>
    </div>
  </div>
</div>

## `exactMatch()`

Deterministic. Deep-equals run output against golden. Passes only when values are identical. Use `fields` to restrict to specific top-level keys:

```ts
import { exactMatch } from "@zcaceres/vibecheck";

judge: exactMatch({ fields: ["name", "status"] });
```

## `fuzzyMatch()`

Flexible comparison with normalization. Configurable tolerance for strings (case, whitespace, edit distance) and numbers:

```ts
import { fuzzyMatch } from "@zcaceres/vibecheck";

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
import { llmJudge } from "@zcaceres/vibecheck";

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
import type { EvalMethod } from "@zcaceres/vibecheck";

const scoreThreshold = (min: number): EvalMethod => async ({ run }) => ({
  pass: (run.output as any).score >= min,
  summary: `score=${(run.output as any).score} (threshold=${min})`,
  diff: { sections: [], summary: "" },
});

// ...
judge: scoreThreshold(0.8),
```

See the [API Reference](/api/) for the full `EvalMethod`, `JudgeInput`, and `EvalVerdict` type definitions.

<div class="vc-otherjudges-header">
  <div class="vc-otherjudges-diamond"></div>
  <div class="vc-otherjudges-title">Other judges</div>
</div>

<div class="vc-otherjudges">
  <a class="vc-otherjudge" href="#exactmatch">
    <div class="vc-otherjudge-name cyan">exactMatch →</div>
    <div class="vc-otherjudge-body">When you want byte-identical output, no slack.</div>
  </a>
  <a class="vc-otherjudge" href="#fuzzymatch">
    <div class="vc-otherjudge-name yellow">fuzzyMatch →</div>
    <div class="vc-otherjudge-body">Levenshtein + numeric tolerance for messy strings.</div>
  </a>
  <a class="vc-otherjudge" href="#llmjudge">
    <div class="vc-otherjudge-name pink">llmJudge →</div>
    <div class="vc-otherjudge-body">Bring your own LLM. Rubric optional.</div>
  </a>
</div>
