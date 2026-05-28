# Getting Started

`vibecheck` (`vibecheck`) is a CLI for running evals on structured LLM outputs and comparing them against blessed reference data ("goldens").

## Install

### Option 1: Standalone binary (recommended)

Download the binary for your platform from [GitHub Releases](https://github.com/zcaceres/vibecheck/releases) and put it on your `PATH`:

```bash
curl -L -o /usr/local/bin/vibecheck \
  https://github.com/zcaceres/vibecheck/releases/latest/download/vc-darwin-arm64
chmod +x /usr/local/bin/vibecheck
```

No Bun, Node, or `node_modules` required — the binary is self-contained.

### Option 2: From source

```bash
git clone https://github.com/zcaceres/vibecheck
cd vibecheck
bun install
bun link
```

Requires [Bun](https://bun.sh).

## Scaffold a project

```bash
vibecheck init
```

This creates:

- `vibecheck.config.ts` — your config (eval functions, judges, schemas)
- `.vibecheck/` — storage for goldens, runs, and reports

## Write your eval function

Open `vibecheck.config.ts` and replace the placeholder `eval` function with your pipeline:

```ts
import { defineConfig, vibecheck } from "vibecheck";

export default defineConfig({
  evals: {
    default: {
      eval: async (ctx) => {
        const input = loadInput(ctx.datasetId);
        return await myLLMPipeline(input);
      },
      judge: vibecheck(),
    },
  },
});
```

## Run your first eval

```bash
vibecheck eval my-dataset
```

The first run has no golden to compare against. Promote the output:

```bash
vibecheck bless my-dataset
```

Now subsequent `vibecheck eval my-dataset` runs diff against the saved golden.

## Next steps

- [Core Concepts](/guide/concepts) — datasets, workers, goldens, variables
- [Judges](/guide/judges) — vibecheck, exactMatch, fuzzyMatch, llmJudge
- [CLI Reference](/cli) — every command and flag
