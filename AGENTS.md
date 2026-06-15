# Easy Eval (vibecheck) — Agent Guide

A CLI toolkit for evaluating structured LLM outputs against golden (reference) datasets.

**Core loop:** bless a golden reference → eval by re-running your generator → diff against golden → bless or merge improvements back.

## Quick Start

```bash
vibecheck init                            # scaffold vibecheck.config.ts and .vibecheck/
# edit vibecheck.config.ts — define your eval() function
vibecheck eval <datasetId>                # run eval, diff against golden
vibecheck bless <datasetId>               # promote output to golden
```

## Key Concepts

**datasetId** — A unique string identifying one input payload (test case). Examples: `"user-123"`, `"invoice-march"`, `"edge-case-empty"`. Your `eval()` function receives it via `ctx.datasetId` and uses it to load the right input data.

**Worker** — A named eval target in the `evals` map of `vibecheck.config.ts`. Most projects have one (`default`). Use `-w <name>` to target others.

**Golden** — The blessed reference output for a dataset. `vibecheck eval` diffs new output against it. `vibecheck bless` promotes a run to golden.

**Variables** — `-v key=value` flags parameterize eval runs (e.g., model, prompt). Access via `ctx.vars` in your eval function. Repeatable.

**Changes** — Codified improvements from eval runs. After `vibecheck eval` shows a diff, you can record a structured change with context (dataset, worker, variables, inputs, diff, note). Before codifying, the CLI offers a regression sweep across all other golden datasets to validate the change doesn't cause regressions.

**diffSchema** (optional) — Define `diffSchema` on a worker for structured section-by-section diffs using section kinds: `scalar`, `keyed-array`, `set`, `ordered-array`. Without it, vibecheck auto-diffs by comparing JSON recursively.

## Commands Reference

### vibecheck init

Scaffold `vibecheck.config.ts`, `.vibecheck/` directory, and `CLAUDE.md` in the current project.

```bash
vibecheck init
```

### vibecheck eval \<datasetId\>

Run the eval function and compare output against golden.

```
Options:
  -w, --worker <name>      Named eval target from config (default: "default")
  -v, --var <key=value>    Pass variables to eval function (repeatable, access via ctx.vars)
  --no-diff                Skip golden comparison and interactive codify prompt
  -f, --format <format>    Output format: table, json, md (default: table)
```

```bash
vibecheck eval user-123                             # run eval and diff against golden
vibecheck eval user-123 --no-diff                   # run without diffing (non-interactive)
vibecheck eval user-123 -v model=gpt-4o             # parameterize with variables
vibecheck eval user-123 -v model=gpt-4o -v temp=0.5 # multiple variables
vibecheck eval user-123 -w my-worker                # target a specific worker
vibecheck eval user-123 -f json                     # output as JSON
```

**Note:** Without `--no-diff`, this command prompts "Codify this change? [y/N]" after showing the diff. Use `--no-diff` for non-interactive / agent usage.

**Regression sweep:** When codifying, if other golden datasets exist for the same worker, `vibecheck eval` offers to run a regression sweep — re-running the eval with the same `-v` variables across all golden datasets. Shows a summary table (match/changed/missing/new per dataset), lets you inspect individual diffs by name, and warns if regressions are found. Sweep runs are saved and visible via `vibecheck runs`/`vibecheck report`.

### vibecheck bless \<datasetId\>

Promote the latest eval output (or a specific past run) to golden reference.

```
Options:
  -w, --worker <name>        Named eval target from config (default: "default")
  --from-run <timestamp>     Promote a specific past eval run instead of latest
```

```bash
vibecheck bless user-123                              # bless latest run as golden
vibecheck bless user-123 --from-run 2025-01-15T10-30-00.000Z
vibecheck bless user-123 -w my-worker
```

If no runs exist, vibecheck runs the eval function first and blesses the result.

### vibecheck runs \<datasetId\>

List past eval runs with timestamp, duration, and cost.

```
Options:
  -w, --worker <name>     Named eval target from config (default: "default")
  -l, --limit <n>         Max runs to show (default: 20)
```

```bash
vibecheck runs user-123
vibecheck runs user-123 -l 5                        # show last 5 runs only
```

### vibecheck report \<datasetId\> [timestamp]

Show diff report comparing an eval run against golden (or against another run). Uses latest run if no timestamp given.

```
Options:
  -w, --worker <name>        Named eval target from config (default: "default")
  -f, --format <format>      Output format: table, json, md (default: table)
  --against <timestamp>      Diff against another run instead of golden
```

```bash
vibecheck report user-123                             # diff latest run vs golden
vibecheck report user-123 2025-01-15T10-30-00.000Z    # specific run
vibecheck report user-123 -f json                     # output as JSON (agent-friendly)
vibecheck report user-123 <ts1> --against <ts2>       # compare two runs directly
vibecheck report user-123 -f md                       # output as markdown
```

### vibecheck sweep \<datasetId\>

Run regression sweep: re-eval all other golden datasets for the same worker. Non-interactive alternative to the sweep built into `vibecheck eval`'s codify flow.

```
Options:
  -w, --worker <name>        Named eval target from config (default: "default")
  -v, --var <key=value>      Pass variables to eval function (repeatable)
  -f, --format <format>      Output format: table, json (default: table)
```

```bash
vibecheck sweep user-123                              # check all other goldens
vibecheck sweep user-123 -v model=gpt-4o              # sweep with variables
vibecheck sweep user-123 -f json                      # output as JSON (agent-friendly)
```

JSON output shape:
```json
{
  "baseDatasetId": "user-123",
  "vars": { "model": "gpt-4o" },
  "results": [
    { "datasetId": "user-456", "status": "clean", "diff": {...}, "durationMs": 1200 },
    { "datasetId": "user-789", "status": "regression", "diff": {...}, "durationMs": 1400 }
  ],
  "summary": { "total": 2, "clean": 1, "regression": 1, "skipped": 0, "error": 0 }
}
```

Each sweep run is saved and visible via `vibecheck runs` / `vibecheck report`.

### vibecheck merge \<datasetId\> [timestamp]

Interactively merge an eval run into golden, section by section.

```
Options:
  -w, --worker <name>     Named eval target from config (default: "default")
```

**Interactive — not suitable for agent use.** For each diffing section, prompts: [g]olden / [e]val / [b]oth / [i]tem-by-item. Use `vibecheck bless` instead for non-interactive promotion.

### vibecheck status

Show overview of all datasets, goldens, and run counts across workers. No arguments.

```bash
vibecheck status
```

### vibecheck validate

Validate `vibecheck.config.ts` configuration: check eval functions, diffSchema, and optionally probe output shape.

```
Options:
  -w, --worker <name>       Validate a specific worker (default: all workers)
  --probe <datasetId>       Run eval once and validate that output matches diffSchema
```

```bash
vibecheck validate                                  # check all workers
vibecheck validate -w my-worker                     # check one worker
vibecheck validate --probe user-123                 # run eval and validate output shape
```

### vibecheck changes list

List codified changes, showing timestamp, dataset, note, and variables.

```
Options:
  -d, --dataset <datasetId>   Filter to changes from a specific dataset
```

```bash
vibecheck changes list
vibecheck changes list -d user-123
```

### vibecheck changes show \<timestamp\>

View a single codified change in detail: dataset, worker, variables, inputs, and diff.

```bash
vibecheck changes show 2025-01-15T10-30-00.000Z
```

### vibecheck changes export

Export codified changes as a markdown changelog.

```
Options:
  -d, --dataset <datasetId>   Filter to changes from a specific dataset
  -o, --out <path>            Write to file instead of stdout
```

```bash
vibecheck changes export                            # print to stdout
vibecheck changes export -o changelog.md            # write to file
vibecheck changes export -d user-123 -o report.md   # filtered, to file
```

### Global Options

```
-c, --config <path>    Path to vibecheck.config.ts (default: auto-detect in cwd)
-V, --version          Output version number
-h, --help             Display help for any command
```

Run `vibecheck <command> --help` for detailed usage of any command.

## Agent Workflow Recommendations

### Non-interactive workflow (recommended for agents)

```bash
vibecheck validate                          # confirm config is valid
vibecheck bless <datasetId>                 # establish golden (first time only)
vibecheck eval <datasetId> --no-diff        # run eval without interactive prompts
vibecheck report <datasetId> -f json        # view diff as structured JSON
vibecheck bless <datasetId>                 # promote if output is better
```

### Improvement loop (agent + human collaboration)

The core iteration cycle for improving eval outputs:

```bash
# 1. Orient — understand the baseline
vibecheck status -f json                              # see all datasets and goldens
vibecheck report <datasetId> -f json                  # current diff against golden

# 2. Hypothesize — propose a change (tweak prompt, vars, code in vibecheck.config.ts)

# 3. Test — run eval with proposed changes
vibecheck eval <datasetId> -v key=value --no-diff -f json

# 4. Assess — read the diff
vibecheck report <datasetId> <timestamp> -f json      # vs golden
vibecheck report <datasetId> <ts1> --against <ts2>    # vs a previous iteration

# 5. Verify — check for regressions across other datasets
vibecheck sweep <datasetId> -v key=value -f json

# 6. Record — codify the improvement
vibecheck changes add <datasetId> <timestamp> --note "what improved"

# 7. Repeat from step 2
```

**Key patterns:**
- Use `-f json` on all read commands for machine-parseable output
- Use `--no-diff` on `vibecheck eval` to skip interactive prompts
- Use `--against` on `vibecheck report` to compare two iterations directly
- Use `vibecheck sweep` to verify a change doesn't regress other datasets
- Use `-v key=value` to parameterize experiments (model, temperature, prompt variant)
- Variables flow to both `eval(ctx)` via `ctx.vars` and `inputs(datasetId, vars)`

### Comparing parameter variations

```bash
vibecheck eval my-dataset -v model=claude-sonnet-4-20250514 --no-diff -f json
vibecheck eval my-dataset -v model=gpt-4o --no-diff -f json
vibecheck runs my-dataset -f json                   # see both runs with cost/duration
vibecheck report my-dataset <ts1> --against <ts2>   # compare the two runs directly
```

### Interactive commands to avoid

- **`vibecheck merge`** — requires interactive stdin (golden/eval/both/item-by-item prompts per section)
- **`vibecheck eval` without `--no-diff`** — prompts "Codify this change? [y/N]" after diff, then optionally a regression sweep with per-dataset inspection

### Reading eval output programmatically

Use `-f json` with `vibecheck eval`, `vibecheck report`, `vibecheck runs`, `vibecheck status`, `vibecheck sweep`, and `vibecheck changes` to get structured JSON output.

## Storage Layout

```
.vibecheck/
  {worker}/{datasetId}/
    golden.json                    # blessed reference output
    runs/{timestamp}.json          # eval run snapshots
    reports/{timestamp}.json       # cached diff reports
  changes/
    {timestamp}.json               # codified improvements
```

Goldens can be committed to git. Runs and reports are ephemeral (`.gitignore`'d by `vibecheck init`).

## Config File (`vibecheck.config.ts`)

Uses `defineConfig()` for type safety. The `evals` map contains named eval targets.

```typescript
import { defineConfig } from "vibecheck";

export default defineConfig({
  evals: {
    default: {
      eval: async (ctx) => {
        const model = ctx.vars.model ?? "gpt-4o";
        return await myPipeline(ctx.inputs, { model });
      },
      inputs: async (datasetId, vars) => loadData(datasetId),
      diffSchema: { sections: [/* ... */] },
    },
  },
  storage: { dir: ".vibecheck" },
});
```

Each eval has:
- **`eval(ctx)`** (required) — produces structured output
- **`inputs(datasetId, vars)`** (optional) — loads input data for the eval (vars from `-v` flags)
- **`diffSchema`** (optional) — structured diff configuration

The `ctx` object provides: `datasetId`, `inputs`, `vars`, `reportCost()`, `reportMeta()`.

## Project tracker

Work for this repo is tracked on the GitHub Project board at
https://github.com/users/zcaceres/projects/2.

The project's configuration — number, owner, project node ID, status field ID,
and status option IDs — is stored in `.github/gh-project.json`. Agents managing
this board should read that file rather than hard-coding IDs (IDs change if the
project is recreated).

Board access goes through `.github/scripts/gh-project-board.sh`:

- `list [--query <q>] [--include-body]` — compact JSONL of all items
- `find <PVTI_… | issue# | title-substring>` — resolve a selector
- `get <item-id>` — full row with body
- `set-status <item-id> <status-name>` — move card between columns

The helper asserts completeness against `totalCount` and exits non-zero on
truncation, so an agent that "doesn't see" a card will fail loudly instead
of silently missing it.

Card workflow:
- Create:    `/gh-project new-task` (creates a linked GitHub issue by default)
- Pick:      `/gh-project next` (shows top Todo cards, moves pick to In Progress, dumps context)
- Edit:      `/gh-project update [id|number|title]`
- Decompose: `/gh-project decompose [id|number|title]` (split a big card into linked subtasks)
- Audit:     `/gh-project review` (board vs codebase)
- Delete:    `/gh-project delete [id|number|title]`

When an item is finished, **move it to the `Done` column — do not delete it.**
Deleted draft items lose their history.
