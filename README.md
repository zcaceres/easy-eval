# easy-eval

A CLI toolkit (`ee`) for evaluating structured LLM outputs against golden datasets.

The core loop: **bless** a golden reference, **eval** by re-running your generator, **judge** the result (diff against golden by default), **merge** improvements back.

## Install

```bash
bun install
```

## Quick start

```bash
ee init              # Scaffold ee.config.ts and .ee/
# Edit ee.config.ts — define your run() function
ee eval my-input     # Run eval, compare against golden
ee bless my-input    # Promote output to golden reference
```

## Concepts

### Dataset ID

Every `ee` command takes a **datasetId** — a unique string that identifies one input payload you want to evaluate. Think of it as a test case name.

Examples: `"user-123"`, `"invoice-march"`, `"edge-case-empty-cart"`, `"joes-pizza"`

Your `run()` function receives the datasetId via `ctx.datasetId`. Use it to load the right input data for that eval run — from a file, a database, a hardcoded map, whatever fits your project.

```ts
export default defineConfig({
  workers: {
    default: {
      run: async (ctx) => {
        const input = loadMyData(ctx.datasetId); // you decide how to load inputs
        return await myLLMPipeline(input);        // returns structured output
      },
    },
  },
});
```

Each datasetId gets its own golden and run history under `.ee/{worker}/{datasetId}/`.

### Workers

A worker is a named eval target. Most projects have one (`default`). Use multiple workers when you have distinct pipelines to evaluate independently.

### Goldens

A golden is the blessed reference output for a dataset. When you run `ee eval`, the framework diffs your new output against the golden. When you're happy with a result, `ee bless` promotes it.

### Variables

Pass `-v key=value` flags to parameterize your eval function — useful for varying models, prompts, or other settings across runs:

```bash
ee eval my-dataset -v model=claude-sonnet-4-20250514 -v prompt="be concise"
```

Access them in your eval function via `ctx.vars`:

```ts
eval: async (ctx) => {
  const model = ctx.vars.model ?? "gpt-4o";
  const prompt = ctx.vars.prompt ?? "default prompt";
  return await myPipeline(ctx.inputs, { model, prompt });
},
```

### Judges

A judge determines pass/fail for an eval run. Set `judge` on your eval definition — if omitted, `vibecheck()` is used by default.

**`vibecheck()`** — the default judge. Diffs eval output against golden and passes when nothing changed, went missing, or was added. Without a schema it auto-diffs JSON recursively. Pass a schema for structured section-by-section diffs:

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

Schema section kinds: `scalar`, `keyed-array`, `set`, `ordered-array`.

**`exactMatch()`** — deterministic judge. Deep-equals the run output against golden. Passes only when values are identical. Use `fields` to restrict which top-level keys are checked:

```ts
import { defineConfig, exactMatch } from "easy-eval";

export default defineConfig({
  evals: {
    default: {
      eval: async (ctx) => { /* ... */ },
      judge: exactMatch({ fields: ["name", "status"] }),
    },
  },
});
```

**`fuzzyMatch()`** — flexible judge with normalization. Compares fields with configurable tolerance for strings (case, whitespace, edit distance) and numbers:

```ts
import { defineConfig, fuzzyMatch } from "easy-eval";

export default defineConfig({
  evals: {
    default: {
      eval: async (ctx) => { /* ... */ },
      judge: fuzzyMatch({
        ignoreCase: true,          // default: true
        ignoreWhitespace: true,    // default: true
        numericTolerance: 0.1,     // ±10% of golden value
        maxEditDistance: 3,         // Levenshtein distance threshold
        minSimilarity: 0.9,        // normalized similarity ratio (0–1)
        fields: ["name", "score"], // optional: restrict to these keys
      }),
    },
  },
});
```

String matching: normalization (case, whitespace) is applied first, then exact comparison. If the strings still differ and `maxEditDistance` or `minSimilarity` is set, Levenshtein distance is checked — passing either threshold is enough. Arrays are compared as sets (order-insensitive).

### Diff Schema (framework-level)

`diffSchema` on an eval definition controls how the framework renders diffs in `ee report`, `ee merge`, and `ee changes`. This is separate from the judge — it's for human-readable display of output comparisons.

### Regression Sweep

When you codify a change after `ee eval`, the CLI checks for other golden datasets under the same worker. If any exist, it offers to run a **regression sweep** — re-running your eval with the same variables across all golden datasets to check for regressions before saving the change.

The sweep shows a summary table with match/changed/missing/new counts per dataset. You can drill into any dataset's detailed diff by name. If regressions are found (changed or missing items), you're warned before the change is saved.

This prevents a change that looks good on one dataset from silently breaking others.

## CLI commands

```
ee init                              Scaffold ee.config.ts and .ee/
ee eval <datasetId> [-v key=value]   Run eval function, compare against golden
ee bless <datasetId>                 Promote output to golden
ee runs <datasetId>                  List past eval runs
ee report <datasetId> [timestamp]    Show diff report from cached run
ee merge <datasetId> [timestamp]     Interactively merge eval into golden
ee status                            Overview of all datasets and goldens
```

## Development

```bash
bun run src/cli.ts --help          # Run CLI locally
bun run typecheck                  # Type check
bun run src/cli.ts eval <id>       # Test with a local ee.config.ts
```

## Runtime

Bun only. Dependencies: `commander`. Keep deps minimal.
