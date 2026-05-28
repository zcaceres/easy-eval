#!/usr/bin/env bun
import * as easyEvalApi from "./index";

// Lets user `ee.config.ts` files resolve `import "easy-eval"` when running from
// the compiled standalone binary, which has no access to their node_modules.
Bun.plugin({
  name: "easy-eval-self",
  setup(build) {
    build.module("easy-eval", () => ({
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
  .name("ee")
  .description("Easy Eval — evaluate structured LLM outputs against golden datasets")
  .version("0.1.0")
  .option("-c, --config <path>", "Path to ee.config.ts (default: auto-detect in cwd)")
  .addHelpText('after', `
Workflow:
  1. ee init                  Scaffold config and storage
  2. ee eval <datasetId>      Run eval, compare against golden
  3. ee bless <datasetId>     Promote output to golden reference
  4. ee report <datasetId>    Review diffs from past runs

A datasetId is a unique string identifying one test case (e.g. "user-123").
Run ee <command> --help for detailed usage of any command.`);

function globalOpts(): { config?: string } {
  return program.opts();
}

program
  .command("init")
  .description("Scaffold ee.config.ts, .ee/ directory, and CLAUDE.md in the current project")
  .addHelpText('after', `
Example:
  $ ee init
  Created ee.config.ts
  Created .ee/ directory
  Created CLAUDE.md

After init, edit ee.config.ts to define your eval() function, then run:
  $ ee eval my-first-dataset`)
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
  $ ee eval user-123                           Run eval and diff against golden
  $ ee eval user-123 --no-diff                 Run without diffing (non-interactive)
  $ ee eval user-123 -v model=gpt-4o           Parameterize with variables
  $ ee eval user-123 -v model=gpt-4o -v temp=0.5
  $ ee eval user-123 -w my-worker -f json      Target worker, output as JSON

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
  $ ee bless user-123                          Bless latest run as golden
  $ ee bless user-123 --from-run 2025-01-15T10-30-00.000Z
  $ ee bless user-123 -w my-worker

If no runs exist, ee runs the eval function first and blesses the result.`)
  .action((datasetId, opts) => cmdBless(datasetId, { ...opts, ...globalOpts() }));

program
  .command("runs <datasetId>")
  .description("List past eval runs for a dataset, showing timestamp, duration, and cost")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("-l, --limit <n>", "Max runs to show (default: 20)")
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ ee runs user-123
  $ ee runs user-123 -l 5                      Show last 5 runs only
  $ ee runs user-123 -f json                   Output as JSON`)
  .action((datasetId, opts) => cmdRuns(datasetId, { ...opts, ...globalOpts() }));

program
  .command("report <datasetId> [timestamp]")
  .description("Show diff report comparing an eval run against golden (latest run if no timestamp)")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("-f, --format <format>", "Output format: table, json, md (default: table)")
  .option("--against <timestamp>", "Diff against another run instead of golden (run-vs-run comparison)")
  .addHelpText('after', `
Examples:
  $ ee report user-123                         Diff latest run vs golden
  $ ee report user-123 2025-01-15T10-30-00.000Z
  $ ee report user-123 -f json                 Output as JSON (agent-friendly)
  $ ee report user-123 <ts1> --against <ts2>   Compare two runs directly
  $ ee report user-123 -f md                   Output as markdown`)
  .action((datasetId, timestamp, opts) => cmdReport(datasetId, timestamp, { ...opts, ...globalOpts() }));

program
  .command("merge <datasetId> [timestamp]")
  .description("Interactively merge an eval run into golden (section by section)")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .addHelpText('after', `
Examples:
  $ ee merge user-123                          Merge latest run into golden
  $ ee merge user-123 2025-01-15T10-30-00.000Z

Interactive: for each diffing section, choose [g]olden / [e]val / [b]oth / [i]tem-by-item.
Not suitable for non-interactive / agent usage — use "ee bless" instead.`)
  .action((datasetId, timestamp, opts) => cmdMerge(datasetId, timestamp, { ...opts, ...globalOpts() }));

program
  .command("sweep <datasetId>")
  .description("Run regression sweep: re-eval all other golden datasets for the same worker")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("-v, --var <key=value>", "Pass variables to eval function, repeatable (access via ctx.vars)", collectVars, {})
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ ee sweep user-123                            Check all other goldens
  $ ee sweep user-123 -v model=gpt-4o            Sweep with variables
  $ ee sweep user-123 -f json                    Output as JSON (agent-friendly)
  $ ee sweep user-123 -w my-worker

Runs the eval function against every golden dataset (except the given one)
for the same worker. Reports which datasets match and which regressed.
Each sweep run is saved and visible in "ee runs" / "ee report".`)
  .action((datasetId, opts) => cmdSweep(datasetId, { ...opts, ...globalOpts() }));

program
  .command("status")
  .description("Show overview of all datasets, goldens, and run counts across workers")
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ ee status
  $ ee status -f json                          Output as JSON`)
  .action((opts) => cmdStatus({ ...opts, ...globalOpts() }));

program
  .command("validate")
  .description("Validate ee.config.ts: check eval functions, diffSchema, and optionally probe output shape")
  .option("-w, --worker <name>", "Validate a specific worker (default: all workers)")
  .option("--probe <datasetId>", "Run eval once and validate that output matches diffSchema")
  .addHelpText('after', `
Examples:
  $ ee validate                                Check all workers
  $ ee validate -w my-worker                   Check one worker
  $ ee validate --probe user-123               Run eval and validate output shape`)
  .action((opts) => cmdValidate({ ...opts, ...globalOpts() }));

const changes = program
  .command("changes")
  .description("Manage codified changes — structured records of eval improvements with context and diffs")
  .addHelpText('after', `
Changes are created during "ee eval" when you answer "Codify this change? [y]",
or programmatically via "ee changes add".
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
  $ ee changes list
  $ ee changes list -d user-123
  $ ee changes list -f json`)
  .action((opts) => cmdChanges({ ...opts, ...globalOpts() }));

changes
  .command("show <timestamp>")
  .description("View a codified change in detail: dataset, worker, variables, inputs, and diff")
  .option("-f, --format <format>", "Output format: table, json (default: table)")
  .addHelpText('after', `
Examples:
  $ ee changes show 2025-01-15T10-30-00.000Z
  $ ee changes show 2025-01-15T10-30-00.000Z -f json`)
  .action((timestamp, opts) => cmdChange(timestamp, { ...opts, ...globalOpts() }));

changes
  .command("add <datasetId> [runTimestamp]")
  .description("Create a change from an existing eval run (non-interactive)")
  .option("-w, --worker <name>", "Named eval target from config (default: \"default\")")
  .option("--note <text>", "Note describing the change")
  .addHelpText('after', `
Examples:
  $ ee changes add user-123                    Codify from latest run
  $ ee changes add user-123 2025-01-15T10-30-00.000Z --note "improved extraction"
  $ ee changes add user-123 -w my-worker`)
  .action((datasetId, runTimestamp, opts) => cmdAddChange(datasetId, runTimestamp, { ...opts, ...globalOpts() }));

changes
  .command("export")
  .description("Export codified changes as a markdown changelog")
  .option("-d, --dataset <datasetId>", "Filter to changes from a specific dataset")
  .option("-o, --out <path>", "Write to file instead of stdout")
  .addHelpText('after', `
Examples:
  $ ee changes export                          Print to stdout
  $ ee changes export -o changelog.md          Write to file
  $ ee changes export -d user-123 -o report.md`)
  .action((opts) => cmdExportChanges({ ...opts, ...globalOpts() }));

program.parse();
