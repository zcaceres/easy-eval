# easy-eval

A CLI toolkit (`ee`) for evaluating structured LLM outputs against golden datasets.

**Kanban:** https://github.com/users/zcaceres/projects/2
**Repo:** https://github.com/zcaceres/easy-eval

## What this is

Generalized, open-source extraction of the eval framework from `~/storesdata/pipeline`. The core loop — **bless** a golden reference, **eval** by re-running a generator, **diff** against golden, **merge** improvements back — is pipeline-agnostic. Users plug in their own eval function and output schema.

## Architecture decisions

- **Bun-only runtime.** No Node/tsx support. Bun handles TS natively, runs `ee.config.ts` directly.
- **Pluggable judges.** `EvalDef.judge` determines pass/fail. Default is `vibecheck()`, which diffs eval output against golden. Judges are `EvalMethod` functions: `(JudgeInput) => Promise<EvalVerdict>`. vibecheck accepts an optional `schema` for structured diffs; without one it auto-diffs JSON recursively.
- **Framework-level diffSchema.** `EvalDef.diffSchema` controls how `ee report`, `ee merge`, and `ee changes` render diffs. Separate from the judge — judges own their own comparison logic.
- **Config is code, not YAML.** `ee.config.ts` exports via `defineConfig()` for type safety.
- **Storage is project-local.** `.ee/{worker}/{datasetId}/` — not a global cache. Goldens can be committed to git; runs/reports are ephemeral.
- **Workers are named eval targets.** Most projects have one (`default`). The `workers` map handles multi-eval projects.
- **The framework manages outputs only.** It does not manage input data. Users optionally provide an `inputs()` function that loads whatever their eval function needs.
- **Cost tracking is user-reported.** The user calls `ctx.reportCost()` during their run function. The framework stores and displays it.

## CLI commands

```
ee init                              Scaffold ee.config.ts and .ee/
ee eval <datasetId>                  Run eval function, compare against golden
ee bless <datasetId>                 Promote output to golden
ee runs <datasetId>                  List past eval runs
ee report <datasetId> [timestamp]    Show diff report from cached run
ee report <id> <ts> --against <ts2>  Compare two runs directly (run-vs-run)
ee sweep <datasetId>                 Non-interactive regression sweep
ee merge <datasetId> [timestamp]     Interactively merge eval into golden
ee status                            Overview of all datasets and goldens
ee changes list [-d datasetId]       List codified changes (optionally filtered)
ee changes show <timestamp>          View a codified change in detail
ee changes export [-d id] [-o path]  Export changes as markdown
```

### Regression sweep

Two paths: (1) built into `ee eval`'s interactive codify flow, and (2) standalone `ee sweep <datasetId>` for non-interactive/agent use. Both re-run the eval with the same `-v` variables across all other golden datasets for the same worker. Shows match/regression/skipped per dataset. Runs are saved via `saveRun()` so results persist in `ee runs`/`ee report`.

## Project structure

```
src/
  cli.ts              Commander.js entry point (bin: "ee")
  index.ts            Public API: defineConfig + type re-exports
  types.ts            All core types
  config/loader.ts    Find and import ee.config.ts
  commands/           One file per CLI command
  judges/             Eval methods (vibecheck, future: llm-judge)
  storage/            Filesystem ops for golden, runs, reports
  diff/               Diff engines (auto-recursive + schema-driven)
  merge/              Interactive merge UI
  render/             Table + ANSI color renderers
templates/basic/      Starter ee.config.ts for `ee init`
```

## Key types

- `EvalConfig` — top-level config with `evals` map and optional `storage`
- `EvalDef` — `eval` function + optional `judge`, `diffSchema`, `inputs`
- `EvalMethod` — judge function: `(JudgeInput) => Promise<EvalVerdict>`
- `EvalVerdict` — judge output: `{ diff, pass, summary, metadata? }`
- `JudgeInput` — judge input: `{ run, golden, evalDef }`
- `EvalContext` — passed to `eval`: `datasetId`, `inputs`, `vars`, `reportCost()`, `reportMeta()`
- `Golden<T>` — blessed reference: `{ blessedAt, datasetId, worker, output }`
- `EvalRun<T>` — run snapshot: `{ timestamp, datasetId, worker, durationMs, cost, output }`
- `DiffResult` — diff output: `{ sections: SectionDiff[], summary }`
- `SectionConfig` — `scalar | keyed-array | set | ordered-array`
- `Change` — codified improvement: `{ timestamp, datasetId, worker, runTimestamp, inputs, vars, diff, note }`
- `SweepDatasetResult` — per-dataset result from regression sweep: `{ datasetId, status, diff, durationMs, cost, error }`

## Development

```bash
bun run src/cli.ts --help          # Run CLI locally
bun run typecheck                  # Type check
bun run src/cli.ts eval <id>       # Test with a local ee.config.ts
```

## Runtime

- Bun only. Use `bun` not `node`.
- Use `bun test` for tests.
- Dependencies: `commander` (CLI framework). Keep deps minimal.

## Origin

Abstracted from `~/storesdata/pipeline/lib/brand-research/eval/`. Key files that informed the design:
- `eval-cli.ts` — command structure (bless/eval/runs/report/merge)
- `eval-storage.ts` — golden/run persistence pattern
- `eval-diff.ts` — section-based diffing with `SectionDiff`/`DetailRow`
- `eval-merge.ts` — generic `mergeArray<T>` with `keyFn`/`labelFn`/`eqFn`
- `eval-refine.md` — Claude Code skill for tracing regressions (future `ee:refine`)
