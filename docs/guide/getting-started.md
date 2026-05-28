# Getting Started

`easy-eval` (`ee`) is a CLI for running evals on structured LLM outputs and comparing them against blessed reference data ("goldens").

## Install

### Option 1: Standalone binary (recommended)

Download the binary for your platform from [GitHub Releases](https://github.com/zcaceres/easy-eval/releases) and put it on your `PATH`:

```bash
curl -L -o /usr/local/bin/ee \
  https://github.com/zcaceres/easy-eval/releases/latest/download/ee-darwin-arm64
chmod +x /usr/local/bin/ee
```

No Bun, Node, or `node_modules` required — the binary is self-contained.

### Option 2: From source

```bash
git clone https://github.com/zcaceres/easy-eval
cd easy-eval
bun install
bun link
```

Requires [Bun](https://bun.sh).

## Scaffold a project

```bash
ee init
```

This creates:

- `ee.config.ts` — your config (eval functions, judges, schemas)
- `.ee/` — storage for goldens, runs, and reports

## Write your eval function

Open `ee.config.ts` and replace the placeholder `eval` function with your pipeline:

```ts
import { defineConfig, vibecheck } from "easy-eval";

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
ee eval my-dataset
```

The first run has no golden to compare against. Promote the output:

```bash
ee bless my-dataset
```

Now subsequent `ee eval my-dataset` runs diff against the saved golden.

## Next steps

- [Core Concepts](/guide/concepts) — datasets, workers, goldens, variables
- [Judges](/guide/judges) — vibecheck, exactMatch, fuzzyMatch, llmJudge
- [CLI Reference](/cli) — every command and flag
