#!/usr/bin/env bun
import * as easyEvalApi from "./index";

// Lets user `vibecheck.config.ts` files resolve `import "vibecheck"` when running from
// the compiled standalone binary, which has no access to their node_modules.
Bun.plugin({
  name: "vibecheck-self",
  setup(build) {
    build.module("vibecheck", () => ({
      exports: easyEvalApi,
      loader: "object",
    }));
  },
});

import { Command } from "commander";
import { cmdInit } from "./commands/init";
import { cmdEval } from "./commands/eval";
import { cmdBless } from "./commands/bless";
import { cmdRuns } from "./commands/runs";
import { cmdReport } from "./commands/report";
import { cmdMerge } from "./commands/merge";
import { cmdStatus } from "./commands/status";
import { cmdValidate } from "./commands/validate";
import { cmdChanges, cmdChange, cmdExportChanges, cmdAddChange } from "./commands/changes";
import { cmdSweep } from "./commands/sweep";
import { collectVars } from "./vars";

const program = new Command();

program
  .name("vibecheck")
  .description("Easy Eval — evaluate structured LLM outputs against golden datasets")
  .version("0.1.0")
  .option("-c, --config <path>", "Path to vibecheck.config.ts (default: auto-detect in cwd)")
  .addHelpText('after', `
Workflow:
  1. vibecheck init                  Scaffold config and storage
  2. vibecheck eval <datasetId>      Run eval, compare against golden
  3. vibecheck bless <datasetId>     Promote output to golden reference
  4. vibecheck report <datasetId>    Review diffs from past runs

A datasetId is a unique string identifying one test case (e.g. "user-123").
Run vibecheck <command> --help for detailed usage of any command.`);

function globalOpts(): { config?: string } {
  return program.opts();
}

program
  .command("init")
  .description("Scaffold vibecheck.config.ts, .vibecheck/ directory, and CLAUDE.md in the current project")
  .addHelpText('after', `
Example:
  $ vibecheck init
  Created vibecheck.config.ts
  Created .vibecheck/ directory
  Created CLAUDE.md

After init, edit vibecheck.config.ts to define your eval() function, then run:
  $ vibecheck eval my-first-dataset`)
  .action(() => cmdInit());

program
  .command("eval <datasetId>")
  .description("Run the eval function for a dataset and compare against golden output")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("-v, --var <key=value>", "Pass variables to eval function, repeatable (access via ctx.vars)", collectVars, {})
  .option("--no-diff", "Skip golden comparison and interactive codify prompt")
  .option("-f, --format <format>", "Output format: table, json, md (default: table)")
  .addHelpText('after', `
Examples:
  $ vibecheck eval user-123                           Run eval and diff against golden
  $ vibecheck eval user-123 --no-diff                 Run without diffing (non-interactive)
  $ vibecheck eval user-123 -v model=gpt-4o           Parameterize with variables
  $ vibecheck eval user-123 -v model=gpt-4o -v temp=0.5
  $ vibecheck eval user-123 -w my-worker -f json      Target worker, output as JSON

Note: Without --no-diff, this command prompts "Codify this change? [y/N]"
after showing the diff. Use --no-diff for non-interactive / agent usage.`)
  .action((datasetId, opts) => cmdEval(datasetId, { ...opts, ...globalOpts() }));

program
  .command("bless <datasetId>")
  .description("Promote the latest eval output (or a specific past run) to golden reference")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("--from-run <timestamp>", "Promote a specific past eval run instead of latest")
  .addHelpText('after', `
Examples:
  $ vibecheck bless user-123                          Bless latest run as golden
  $ vibecheck bless user-123 --from-run 2025-01-15T10-30-00.000Z
  $ vibecheck bless user-123 -w my-worker

If no runs exist, vibecheck runs the eval function first and blesses the result.`)
  .action((datasetId, opts) => cmdBless(datasetId, { ...opts, ...globalOpts() }));

program
  .command("runs <datasetId>")
  .description("List past eval runs for a dataset, showing timestamp, duration, and cost")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("-l, --limit <n>", "Max runs to show (default: 20)")
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ vibecheck runs user-123
  $ vibecheck runs user-123 -l 5                      Show last 5 runs only
  $ vibecheck runs user-123 -f json                   Output as JSON`)
  .action((datasetId, opts) => cmdRuns(datasetId, { ...opts, ...globalOpts() }));

program
  .command("report <datasetId> [timestamp]")
  .description("Show diff report comparing an eval run against golden (latest run if no timestamp)")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("-f, --format <format>", "Output format: table, json, md (default: table)")
  .option("--against <timestamp>", "Diff against another run instead of golden (run-vs-run comparison)")
  .addHelpText('after', `
Examples:
  $ vibecheck report user-123                         Diff latest run vs golden
  $ vibecheck report user-123 2025-01-15T10-30-00.000Z
  $ vibecheck report user-123 -f json                 Output as JSON (agent-friendly)
  $ vibecheck report user-123 <ts1> --against <ts2>   Compare two runs directly
  $ vibecheck report user-123 -f md                   Output as markdown`)
  .action((datasetId, timestamp, opts) => cmdReport(datasetId, timestamp, { ...opts, ...globalOpts() }));

program
  .command("merge <datasetId> [timestamp]")
  .description("Interactively merge an eval run into golden (section by section)")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .addHelpText('after', `
Examples:
  $ vibecheck merge user-123                          Merge latest run into golden
  $ vibecheck merge user-123 2025-01-15T10-30-00.000Z

Interactive: for each diffing section, choose [g]olden / [e]val / [b]oth / [i]tem-by-item.
Not suitable for non-interactive / agent usage — use "vibecheck bless" instead.`)
  .action((datasetId, timestamp, opts) => cmdMerge(datasetId, timestamp, { ...opts, ...globalOpts() }));

program
  .command("sweep <datasetId>")
  .description("Run regression sweep: re-eval all other golden datasets for the same worker")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("-v, --var <key=value>", "Pass variables to eval function, repeatable (access via ctx.vars)", collectVars, {})
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ vibecheck sweep user-123                            Check all other goldens
  $ vibecheck sweep user-123 -v model=gpt-4o            Sweep with variables
  $ vibecheck sweep user-123 -f json                    Output as JSON (agent-friendly)
  $ vibecheck sweep user-123 -w my-worker

Runs the eval function against every golden dataset (except the given one)
for the same worker. Reports which datasets match and which regressed.
Each sweep run is saved and visible in "vibecheck runs" / "vibecheck report".`)
  .action((datasetId, opts) => cmdSweep(datasetId, { ...opts, ...globalOpts() }));

program
  .command("status")
  .description("Show overview of all datasets, goldens, and run counts across workers")
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ vibecheck status
  $ vibecheck status -f json                          Output as JSON`)
  .action((opts) => cmdStatus({ ...opts, ...globalOpts() }));

program
  .command("validate")
  .description("Validate vibecheck.config.ts: check eval functions, diffSchema, and optionally probe output shape")
  .option("-w, --worker <name>", "Validate a specific worker (default: all workers)")
  .option("--probe <datasetId>", "Run eval once and validate that output matches diffSchema")
  .addHelpText('after', `
Examples:
  $ vibecheck validate                                Check all workers
  $ vibecheck validate -w my-worker                   Check one worker
  $ vibecheck validate --probe user-123               Run eval and validate output shape`)
  .action((opts) => cmdValidate({ ...opts, ...globalOpts() }));

const changes = program
  .command("changes")
  .description("Manage codified changes — structured records of eval improvements with context and diffs")
  .addHelpText('after', `
Changes are created during "vibecheck eval" when you answer "Codify this change? [y]",
or programmatically via "vibecheck changes add".
Each change records: the dataset, worker, variables used, inputs, diff, and an optional note.

Subcommands:
  list       List all codified changes
  show       View a single change in detail
  add        Create a change from an existing run (non-interactive)
  export     Export changes as markdown`);

changes
  .command("list")
  .description("List codified changes, showing timestamp, dataset, note, and variables")
  .option("-d, --dataset <datasetId>", "Filter to changes from a specific dataset")
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ vibecheck changes list
  $ vibecheck changes list -d user-123
  $ vibecheck changes list -f json`)
  .action((opts) => cmdChanges({ ...opts, ...globalOpts() }));

changes
  .command("show <timestamp>")
  .description("View a codified change in detail: dataset, worker, variables, inputs, and diff")
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ vibecheck changes show 2025-01-15T10-30-00.000Z
  $ vibecheck changes show 2025-01-15T10-30-00.000Z -f json`)
  .action((timestamp, opts) => cmdChange(timestamp, { ...opts, ...globalOpts() }));

changes
  .command("add <datasetId> [runTimestamp]")
  .description("Create a change from an existing eval run (non-interactive)")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("--note <text>", "Note describing the change")
  .addHelpText('after', `
Examples:
  $ vibecheck changes add user-123                    Codify from latest run
  $ vibecheck changes add user-123 2025-01-15T10-30-00.000Z --note "improved extraction"
  $ vibecheck changes add user-123 -w my-worker`)
  .action((datasetId, runTimestamp, opts) => cmdAddChange(datasetId, runTimestamp, { ...opts, ...globalOpts() }));

changes
  .command("export")
  .description("Export codified changes as a markdown changelog")
  .option("-d, --dataset <datasetId>", "Filter to changes from a specific dataset")
  .option("-o, --out <path>", "Write to file instead of stdout")
  .addHelpText('after', `
Examples:
  $ vibecheck changes export                          Print to stdout
  $ vibecheck changes export -o changelog.md          Write to file
  $ vibecheck changes export -d user-123 -o report.md`)
  .action((opts) => cmdExportChanges({ ...opts, ...globalOpts() }));

program.parse();
