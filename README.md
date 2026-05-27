# easy-eval

A CLI toolkit (`ee`) for evaluating structured LLM outputs against golden datasets.

The core loop: **bless** a golden reference, **eval** by re-running your generator, **diff** against golden, **merge** improvements back.

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

### Diff Schema (optional)

Define `diffSchema.sections` on an eval for structured section-by-section diffs. Without a diffSchema, easy-eval auto-diffs by comparing JSON recursively.

Section kinds: `scalar`, `keyed-array`, `set`, `ordered-array`.

## CLI commands

```
ee init                              Scaffold ee.config.ts and .ee/
ee eval <datasetId> [-v key=value]    Run eval function, compare against golden
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
