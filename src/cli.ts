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

const program = new Command();

program
  .name("ee")
  .description("Easy Eval — a CLI toolkit for evaluating structured LLM outputs against golden datasets")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold ee.config.ts and .ee/ directory in the current project")
  .action(() => cmdInit());

program
  .command("eval <datasetId>")
  .description("Run the eval function for a dataset and compare against golden")
  .option("-w, --worker <name>", "Which worker to run", "default")
  .option("--no-diff", "Run without comparing to golden")
  .option("-f, --format <format>", "Output format: table, json, md", "table")
  .action(cmdEval);

program
  .command("bless <datasetId>")
  .description("Promote current output (or a past run) to golden")
  .option("-w, --worker <name>", "Which worker", "default")
  .option("--from-run <timestamp>", "Promote a specific past eval run")
  .action(cmdBless);

program
  .command("runs <datasetId>")
  .description("List past eval runs for a dataset")
  .option("-w, --worker <name>", "Which worker", "default")
  .option("-l, --limit <n>", "Max runs to show", "20")
  .action(cmdRuns);

program
  .command("report <datasetId> [timestamp]")
  .description("Show diff report from a cached eval run")
  .option("-w, --worker <name>", "Which worker", "default")
  .option("-f, --format <format>", "Output format: table, md", "table")
  .action(cmdReport);

program
  .command("merge <datasetId> [timestamp]")
  .description("Interactively merge an eval run into the golden dataset")
  .option("-w, --worker <name>", "Which worker", "default")
  .action(cmdMerge);

program
  .command("status")
  .description("Show overview of all datasets, goldens, and runs")
  .action(cmdStatus);

program
  .command("validate")
  .description("Validate ee.config.ts: check schema, worker config, and optionally probe output shape")
  .option("-w, --worker <name>", "Which worker to validate (default: all)")
  .option("--probe <datasetId>", "Run eval once and validate output matches schema")
  .action(cmdValidate);

program.parse();
