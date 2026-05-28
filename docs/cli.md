# CLI Reference

All commands accept a global `-c, --config <path>` flag to point at a custom config file (default: auto-detect `vibecheck.config.ts` in cwd).

## `vibecheck init`

Scaffold `vibecheck.config.ts`, `.vibecheck/` directory, and `CLAUDE.md` in the current project.

## `vibecheck eval <datasetId>`

Run the eval function for a dataset and compare against golden.

```bash
vibecheck eval my-dataset                  # use default worker
vibecheck eval my-dataset -w my-worker     # named worker
vibecheck eval my-dataset -v model=gpt-4o  # pass variables
```

After the diff, the CLI prompts to **codify** the change (record it as a structured entry).

## `vibecheck bless <datasetId>`

Promote the latest run (or a specific past run via `--from-run`) to golden.

```bash
vibecheck bless my-dataset
vibecheck bless my-dataset --from-run 2025-01-15T10-30-00.000Z
```

If no runs exist, runs the eval first, then blesses.

## `vibecheck runs <datasetId>`

List past eval runs with timestamp, duration, and cost.

## `vibecheck report <datasetId> [timestamp]`

Show the diff report for a past run (latest if no timestamp).

```bash
vibecheck report my-dataset                                    # latest vs golden
vibecheck report my-dataset 2025-01-15T10-30-00.000Z          # specific run vs golden
vibecheck report my-dataset 2025-01-15T10-30-00 --against ...  # run vs run
```

## `vibecheck merge <datasetId> [timestamp]`

Interactively merge a run into golden, section by section. Accept or reject each diff.

## `vibecheck sweep <datasetId>`

Non-interactive regression sweep: re-eval all other golden datasets for the same worker with the current code/variables. See the [Regression Sweep](/guide/sweep) guide.

## `vibecheck status`

Overview of all datasets, goldens, and run counts across workers.

## `vibecheck changes`

Manage codified changes — structured records of eval improvements.

```bash
vibecheck changes list                       # all changes
vibecheck changes list -d my-dataset         # filter by dataset
vibecheck changes show <timestamp>           # detail view
vibecheck changes export -d my-dataset -o changes.md
```

## `vibecheck validate`

Validate `vibecheck.config.ts`: check eval functions, diffSchema, and optionally probe output shape.

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Success (eval passed, or non-evaluating command succeeded) |
| `1`  | Eval failed / config error / generic error |
