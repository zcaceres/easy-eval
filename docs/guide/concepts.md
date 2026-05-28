# Core Concepts

## Dataset ID

Every `ee` command takes a **datasetId** — a unique string identifying one input payload you want to evaluate. Think of it as a test case name.

Examples: `"user-123"`, `"invoice-march"`, `"edge-case-empty-cart"`, `"joes-pizza"`.

Your eval function receives the datasetId via `ctx.datasetId`. Use it to load the right input data — from a file, database, hardcoded map, whatever fits your project.

```ts
export default defineConfig({
  evals: {
    default: {
      eval: async (ctx) => {
        const input = loadMyData(ctx.datasetId);
        return await myPipeline(input);
      },
    },
  },
});
```

Each datasetId gets its own golden and run history under `.ee/{worker}/{datasetId}/`.

## Workers

A worker is a named eval target. Most projects have one (`default`). Use multiple workers when you have distinct pipelines to evaluate independently — e.g., a summarizer and a classifier in the same repo.

## Goldens

A golden is the blessed reference output for a dataset. When you `ee eval`, the framework runs your eval function and diffs the new output against the golden. When you're happy with a result, `ee bless` promotes it to the new golden.

Goldens live in `.ee/{worker}/{datasetId}/golden.json` — commit them to git so your team shares the same reference data.

## Variables

Pass `-v key=value` flags to parameterize an eval — useful for varying models, prompts, or other settings across runs:

```bash
ee eval my-dataset -v model=claude-sonnet-4 -v prompt="be concise"
```

Access them in your eval function via `ctx.vars`:

```ts
eval: async (ctx) => {
  const model = ctx.vars.model ?? "gpt-4o";
  const prompt = ctx.vars.prompt ?? "default prompt";
  return await myPipeline(ctx.inputs, { model, prompt });
}
```

## Cost tracking

Report cost from inside your eval function via `ctx.reportCost()`. The framework stores and displays it in `ee runs` and `ee report`. Cost reporting is opt-in — the framework doesn't measure anything itself.

```ts
eval: async (ctx) => {
  const result = await myLLMPipeline(ctx.datasetId);
  ctx.reportCost({ usd: result.usage.totalCost });
  return result.output;
}
```

## Codified changes

After an eval shows a difference, you can **codify** the change — record it as a structured entry with a note explaining what improved. Codified changes accumulate in `.ee/{worker}/changes/` and can be reviewed with `ee changes`.

This makes it easy to track *why* a golden moved over time, not just *that* it moved.
