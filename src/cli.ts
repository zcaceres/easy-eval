#!/usr/bin/env bun
import { Command } from "commander";
import { cmdInit } from "./commands/init";
import { cmdEval } from "./commands/eval";
import { cmdBless } from "./commands/bless";
import { cmdRuns } from "./commands/runs";
import { cmdReport } from "./commands/report";
import { cmdMerge } from "./commands/merge";
import { cmdStatus } from "./commands/status";
import { cmdValidate } from "./commands/validate";
import { cmdChanges, cmdChange, cmdExportChanges } from "./commands/changes";
import { collectVars } from "./vars";

const program = new Command();

program
  .name("ee")
  .description("Easy Eval — a CLI toolkit for evaluating structured LLM outputs against golden datasets")
  .version("0.1.0")
  .option("-c, --config <path>", "Path to ee.config.ts (default: auto-detect in cwd)");

function globalOpts(): { config?: string } {
  return program.opts();
}

program
  .command("init")
  .description("Scaffold ee.config.ts and .ee/ directory in the current project")
  .action(() => cmdInit());

program
  .command("eval <datasetId>")
  .description("Run the eval function for a dataset and compare against golden")
  .option("-w, --worker <name>", "Which eval to run (from evals map)", "default")
  .option("-v, --var <key=value>", "Pass variables to the eval function (repeatable)", collectVars, {})
  .option("--no-diff", "Run without comparing to golden")
  .option("-f, --format <format>", "Output format: table, json, md", "table")
  .action((datasetId, opts) => cmdEval(datasetId, { ...opts, ...globalOpts() }));

program
  .command("bless <datasetId>")
  .description("Promote current output (or a past run) to golden")
  .option("-w, --worker <name>", "Which eval to use", "default")
  .option("--from-run <timestamp>", "Promote a specific past eval run")
  .action((datasetId, opts) => cmdBless(datasetId, { ...opts, ...globalOpts() }));

program
  .command("runs <datasetId>")
  .description("List past eval runs for a dataset")
  .option("-w, --worker <name>", "Which eval to use", "default")
  .option("-l, --limit <n>", "Max runs to show", "20")
  .action((datasetId, opts) => cmdRuns(datasetId, { ...opts, ...globalOpts() }));

program
  .command("report <datasetId> [timestamp]")
  .description("Show diff report from a cached eval run")
  .option("-w, --worker <name>", "Which eval to use", "default")
  .option("-f, --format <format>", "Output format: table, md", "table")
  .action((datasetId, timestamp, opts) => cmdReport(datasetId, timestamp, { ...opts, ...globalOpts() }));

program
  .command("merge <datasetId> [timestamp]")
  .description("Interactively merge an eval run into the golden dataset")
  .option("-w, --worker <name>", "Which eval to use", "default")
  .action((datasetId, timestamp, opts) => cmdMerge(datasetId, timestamp, { ...opts, ...globalOpts() }));

program
  .command("status")
  .description("Show overview of all datasets, goldens, and runs")
  .action((opts) => cmdStatus({ ...opts, ...globalOpts() }));

program
  .command("validate")
  .description("Validate ee.config.ts: check eval config, diffSchema, and optionally probe output shape")
  .option("-w, --worker <name>", "Which eval to validate (default: all)")
  .option("--probe <datasetId>", "Run eval once and validate output matches schema")
  .action((opts) => cmdValidate({ ...opts, ...globalOpts() }));

const changes = program
  .command("changes")
  .description("Manage codified changes");

changes
  .command("list")
  .description("List codified changes across the project")
  .option("-d, --dataset <datasetId>", "Filter to changes from a specific dataset")
  .action((opts) => cmdChanges({ ...opts, ...globalOpts() }));

changes
  .command("show <timestamp>")
  .description("View a codified change in detail")
  .action((timestamp, opts) => cmdChange(timestamp, { ...opts, ...globalOpts() }));

changes
  .command("export")
  .description("Export codified changes as markdown")
  .option("-d, --dataset <datasetId>", "Filter to changes from a specific dataset")
  .option("-o, --out <path>", "Write to file instead of stdout")
  .action((opts) => cmdExportChanges({ ...opts, ...globalOpts() }));

program.parse();
