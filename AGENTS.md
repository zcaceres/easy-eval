# Easy Eval (ee) — Agent Guide

A CLI toolkit for evaluating structured LLM outputs against golden (reference) datasets.

**Core loop:** bless a golden reference → eval by re-running your generator → diff against golden → bless or merge improvements back.

## Quick Start

```bash
ee init                            # scaffold ee.config.ts and .ee/
# edit ee.config.ts — define your eval() function
ee eval <datasetId>                # run eval, diff against golden
ee bless <datasetId>               # promote output to golden
```

## Key Concepts

**datasetId** — A unique string identifying one input payload (test case). Examples: `"user-123"`, `"invoice-march"`, `"edge-case-empty"`. Your `eval()` function receives it via `ctx.datasetId` and uses it to load the right input data.

**Worker** — A named eval target in the `evals` map of `ee.config.ts`. Most projects have one (`default`). Use `-w <name>` to target others.

**Golden** — The blessed reference output for a dataset. `ee eval` diffs new output against it. `ee bless` promotes a run to golden.

**Variables** — `-v key=value` flags parameterize eval runs (e.g., model, prompt). Access via `ctx.vars` in your eval function. Repeatable.

**Changes** — Codified improvements from eval runs. After `ee eval` shows a diff, you can record a structured change with context (dataset, worker, variables, inputs, diff, note).

**diffSchema** (optional) — Define `diffSchema` on a worker for structured section-by-section diffs using section kinds: `scalar`, `keyed-array`, `set`, `ordered-array`. Without it, ee auto-diffs by comparing JSON recursively.

## Commands Reference

### ee init

Scaffold `ee.config.ts`, `.ee/` directory, and `CLAUDE.md` in the current project.

```bash
ee init
```

### ee eval \<datasetId\>

Run the eval function and compare output against golden.

```
Options:
  -w, --worker <name>      Named eval target from config (default: "default")
  -v, --var <key=value>    Pass variables to eval function (repeatable, access via ctx.vars)
  --no-diff                Skip golden comparison and interactive codify prompt
  -f, --format <format>    Output format: table, json, md (default: table)
```

```bash
ee eval user-123                             # run eval and diff against golden
ee eval user-123 --no-diff                   # run without diffing (non-interactive)
ee eval user-123 -v model=gpt-4o             # parameterize with variables
ee eval user-123 -v model=gpt-4o -v temp=0.5 # multiple variables
ee eval user-123 -w my-worker                # target a specific worker
ee eval user-123 -f json                     # output as JSON
```

**Note:** Without `--no-diff`, this command prompts "Codify this change? [y/N]" after showing the diff. Use `--no-diff` for non-interactive / agent usage.

### ee bless \<datasetId\>

Promote the latest eval output (or a specific past run) to golden reference.

```
Options:
  -w, --worker <name>        Named eval target from config (default: "default")
  --from-run <timestamp>     Promote a specific past eval run instead of latest
```

```bash
ee bless user-123                              # bless latest run as golden
ee bless user-123 --from-run 2025-01-15T10-30-00.000Z
ee bless user-123 -w my-worker
```

If no runs exist, ee runs the eval function first and blesses the result.

### ee runs \<datasetId\>

List past eval runs with timestamp, duration, and cost.

```
Options:
  -w, --worker <name>     Named eval target from config (default: "default")
  -l, --limit <n>         Max runs to show (default: 20)
```

```bash
ee runs user-123
ee runs user-123 -l 5                        # show last 5 runs only
```

### ee report \<datasetId\> [timestamp]

Show diff report comparing an eval run against golden. Uses latest run if no timestamp given.

```
Options:
  -w, --worker <name>     Named eval target from config (default: "default")
  -f, --format <format>   Output format: table, md (default: table)
```

```bash
ee report user-123                             # diff latest run vs golden
ee report user-123 2025-01-15T10-30-00.000Z    # specific run
ee report user-123 -f md                       # output as markdown
```

### ee merge \<datasetId\> [timestamp]

Interactively merge an eval run into golden, section by section.

```
Options:
  -w, --worker <name>     Named eval target from config (default: "default")
```

**Interactive — not suitable for agent use.** For each diffing section, prompts: [g]olden / [e]val / [b]oth / [i]tem-by-item. Use `ee bless` instead for non-interactive promotion.

### ee status

Show overview of all datasets, goldens, and run counts across workers. No arguments.

```bash
ee status
```

### ee validate

Validate `ee.config.ts` configuration: check eval functions, diffSchema, and optionally probe output shape.

```
Options:
  -w, --worker <name>       Validate a specific worker (default: all workers)
  --probe <datasetId>       Run eval once and validate that output matches diffSchema
```

```bash
ee validate                                  # check all workers
ee validate -w my-worker                     # check one worker
ee validate --probe user-123                 # run eval and validate output shape
```

### ee changes list

List codified changes, showing timestamp, dataset, note, and variables.

```
Options:
  -d, --dataset <datasetId>   Filter to changes from a specific dataset
```

```bash
ee changes list
ee changes list -d user-123
```

### ee changes show \<timestamp\>

View a single codified change in detail: dataset, worker, variables, inputs, and diff.

```bash
ee changes show 2025-01-15T10-30-00.000Z
```

### ee changes export

Export codified changes as a markdown changelog.

```
Options:
  -d, --dataset <datasetId>   Filter to changes from a specific dataset
  -o, --out <path>            Write to file instead of stdout
```

```bash
ee changes export                            # print to stdout
ee changes export -o changelog.md            # write to file
ee changes export -d user-123 -o report.md   # filtered, to file
```

### Global Options

```
-c, --config <path>    Path to ee.config.ts (default: auto-detect in cwd)
-V, --version          Output version number
-h, --help             Display help for any command
```

Run `ee <command> --help` for detailed usage of any command.

## Agent Workflow Recommendations

### Non-interactive workflow (recommended for agents)

```bash
ee validate                          # confirm config is valid
ee bless <datasetId>                 # establish golden (first time only)
ee eval <datasetId> --no-diff        # run eval without interactive prompts
ee report <datasetId>                # view diff as table output
ee bless <datasetId>                 # promote if output is better
```

### Comparing parameter variations

```bash
ee eval my-dataset -v model=claude-sonnet-4-20250514
ee eval my-dataset -v model=gpt-4o
ee runs my-dataset                   # see both runs with cost/duration
ee report my-dataset <timestamp>     # compare specific run to golden
```

### Interactive commands to avoid

- **`ee merge`** — requires interactive stdin (golden/eval/both/item-by-item prompts per section)
- **`ee eval` without `--no-diff`** — prompts "Codify this change? [y/N]" after diff

### Reading eval output programmatically

Use `-f json` with `ee eval` to get structured JSON output instead of a table.

## Storage Layout

```
.ee/
  {worker}/{datasetId}/
    golden.json                    # blessed reference output
    runs/{timestamp}.json          # eval run snapshots
    reports/{timestamp}.json       # cached diff reports
  changes/
    {timestamp}.json               # codified improvements
```

Goldens can be committed to git. Runs and reports are ephemeral (`.gitignore`'d by `ee init`).

## Config File (`ee.config.ts`)

Uses `defineConfig()` for type safety. The `evals` map contains named eval targets.

```typescript
import { defineConfig } from "easy-eval";

export default defineConfig({
  evals: {
    default: {
      eval: async (ctx) => {
        const model = ctx.vars.model ?? "gpt-4o";
        return await myPipeline(ctx.inputs, { model });
      },
      inputs: async (datasetId) => loadData(datasetId),
      diffSchema: { sections: [/* ... */] },
    },
  },
  storage: { dir: ".ee" },
});
```

Each eval has:
- **`eval(ctx)`** (required) — produces structured output
- **`inputs(datasetId)`** (optional) — loads input data for the eval
- **`diffSchema`** (optional) — structured diff configuration

The `ctx` object provides: `datasetId`, `inputs`, `vars`, `reportCost()`, `reportMeta()`.
