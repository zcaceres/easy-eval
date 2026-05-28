# CLI Reference

All commands accept a global `-c, --config <path>` flag to point at a custom config file (default: auto-detect `ee.config.ts` in cwd).

## `ee init`

Scaffold `ee.config.ts`, `.ee/` directory, and `CLAUDE.md` in the current project.

## `ee eval <datasetId>`

Run the eval function for a dataset and compare against golden.

```bash
ee eval my-dataset                  # use default worker
ee eval my-dataset -w my-worker     # named worker
ee eval my-dataset -v model=gpt-4o  # pass variables
```

After the diff, the CLI prompts to **codify** the change (record it as a structured entry).

## `ee bless <datasetId>`

Promote the latest run (or a specific past run via `--from-run`) to golden.

```bash
ee bless my-dataset
ee bless my-dataset --from-run 2025-01-15T10-30-00.000Z
```

If no runs exist, runs the eval first, then blesses.

## `ee runs <datasetId>`

List past eval runs with timestamp, duration, and cost.

## `ee report <datasetId> [timestamp]`

Show the diff report for a past run (latest if no timestamp).

```bash
ee report my-dataset                                    # latest vs golden
ee report my-dataset 2025-01-15T10-30-00.000Z          # specific run vs golden
ee report my-dataset 2025-01-15T10-30-00 --against ...  # run vs run
```

## `ee merge <datasetId> [timestamp]`

Interactively merge a run into golden, section by section. Accept or reject each diff.

## `ee sweep <datasetId>`

Non-interactive regression sweep: re-eval all other golden datasets for the same worker with the current code/variables. See the [Regression Sweep](/guide/sweep) guide.

## `ee status`

Overview of all datasets, goldens, and run counts across workers.

## `ee changes`

Manage codified changes — structured records of eval improvements.

```bash
ee changes list                       # all changes
ee changes list -d my-dataset         # filter by dataset
ee changes show <timestamp>           # detail view
ee changes export -d my-dataset -o changes.md
```

## `ee validate`

Validate `ee.config.ts`: check eval functions, diffSchema, and optionally probe output shape.

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Success (eval passed, or non-evaluating command succeeded) |
| `1`  | Eval failed / config error / generic error |
