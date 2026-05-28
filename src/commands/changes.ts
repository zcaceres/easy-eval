import { writeFile } from "fs/promises";
import { loadConfig, resolveEval } from "../config/loader";
import { getStorageRoot } from "../storage/paths";
import { listChanges, loadChange, loadLatestRun, loadRun, loadGolden, saveChange } from "../storage/index";
import { diff } from "../diff/index";
import { renderDiffTable } from "../render/table";
import { bold, dim, cyan, green, red } from "../render/colors";
import type { Change } from "../types";

export async function cmdChanges(
  opts: { dataset?: string; format?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const storageRoot = getStorageRoot(config);

  const changes = await listChanges(storageRoot, opts.dataset);

  if (opts.format === "json") {
    console.log(JSON.stringify({ changes }, null, 2));
    return;
  }

  if (changes.length === 0) {
    if (opts.dataset) {
      console.log(`No changes codified for dataset ${bold(opts.dataset)}.`);
    } else {
      console.log("No changes codified yet.");
    }
    console.log(dim("\nRun `vibecheck eval <datasetId>` and codify a change after reviewing the diff."));
    return;
  }

  const W_TS = 20;
  const W_DS = 20;
  const W_NOTE = 30;
  const W_VARS = 20;

  console.log(
    bold(`${"Timestamp".padEnd(W_TS)} ${"Dataset".padEnd(W_DS)} ${"Note".padEnd(W_NOTE)} ${"Vars".padEnd(W_VARS)}`),
  );
  console.log(dim("─".repeat(W_TS + W_DS + W_NOTE + W_VARS + 3)));

  for (const c of changes) {
    const ts = c.timestamp.slice(0, 19);
    const note = c.note ?? dim("—");
    const vars = Object.keys(c.vars).length > 0
      ? Object.entries(c.vars).map(([k, v]) => `${k}=${v}`).join(", ")
      : dim("—");

    console.log(
      `${ts.padEnd(W_TS)} ${c.datasetId.padEnd(W_DS)} ${trunc(note, W_NOTE).padEnd(W_NOTE)} ${trunc(vars, W_VARS).padEnd(W_VARS)}`,
    );
  }

  console.log(dim(`\n${changes.length} change${changes.length === 1 ? "" : "s"}`));
}

export async function cmdChange(
  timestamp: string,
  opts: { format?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const storageRoot = getStorageRoot(config);

  const change = await loadChange(storageRoot, timestamp);
  if (!change) {
    console.error(`No change found at ${timestamp}`);
    process.exit(1);
  }

  if (opts.format === "json") {
    console.log(JSON.stringify(change, null, 2));
    return;
  }

  console.log(bold("Change") + dim(` ${change.timestamp}`));
  console.log(`  ${cyan("Dataset:")}  ${change.datasetId}`);
  console.log(`  ${cyan("Worker:")}   ${change.worker}`);
  console.log(`  ${cyan("Run:")}      ${change.runTimestamp}`);

  if (change.note) {
    console.log(`  ${cyan("Note:")}     ${change.note}`);
  }

  if (Object.keys(change.vars).length > 0) {
    console.log(`  ${cyan("Vars:")}`);
    for (const [k, v] of Object.entries(change.vars)) {
      console.log(`    ${k} = ${v}`);
    }
  }

  if (change.inputs !== undefined) {
    console.log(`\n${bold("Inputs:")}`);
    console.log(dim(JSON.stringify(change.inputs, null, 2)));
  }

  if (change.metadata && Object.keys(change.metadata).length > 0) {
    console.log(`\n${bold("Metadata:")}`);
    for (const [k, v] of Object.entries(change.metadata)) {
      console.log(`  ${k}: ${JSON.stringify(v)}`);
    }
  }

  if (change.diff) {
    console.log(`\n${bold("Diff:")}`);
    console.log(renderDiffTable(change.diff));
  }
}

export async function cmdAddChange(
  datasetId: string,
  runTimestamp: string | undefined,
  opts: { worker?: string; note?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const { name: evalName, evalDef } = resolveEval(config, opts.worker);
  const storageRoot = getStorageRoot(config);

  const run = runTimestamp
    ? await loadRun(storageRoot, evalName, datasetId, runTimestamp)
    : await loadLatestRun(storageRoot, evalName, datasetId);

  if (!run) {
    const msg = runTimestamp
      ? `No eval run for ${datasetId} at ${runTimestamp}`
      : `No eval runs for ${datasetId}`;
    console.error(red(msg));
    process.exit(1);
  }

  const golden = await loadGolden(storageRoot, evalName, datasetId);
  const result = golden ? diff(golden.output, run.output, evalDef.diffSchema) : undefined;

  const change: Change = {
    timestamp: new Date().toISOString(),
    datasetId,
    worker: evalName,
    runTimestamp: run.timestamp,
    inputs: run.inputs,
    vars: run.vars ?? {},
    diff: result,
    note: opts.note || undefined,
    metadata: run.metadata,
  };

  await saveChange(storageRoot, change);
  console.log(green("✓ Change saved") + dim(` to .vibecheck/changes/`));
}

export async function cmdExportChanges(
  opts: { dataset?: string; out?: string; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);
  const storageRoot = getStorageRoot(config);

  const summaries = await listChanges(storageRoot, opts.dataset);

  if (summaries.length === 0) {
    console.log("No changes to export.");
    return;
  }

  const lines: string[] = [];
  lines.push("# Changelog\n");

  if (opts.dataset) {
    lines.push(`> Filtered to dataset: ${opts.dataset}\n`);
  }

  for (const summary of summaries) {
    const change = await loadChange(storageRoot, summary.timestamp);
    if (!change) continue;

    lines.push(`## ${change.timestamp.slice(0, 19)}\n`);
    lines.push(`- **Dataset:** ${change.datasetId}`);
    lines.push(`- **Worker:** ${change.worker}`);
    lines.push(`- **Run:** ${change.runTimestamp}`);

    if (change.note) {
      lines.push(`- **Note:** ${change.note}`);
    }

    if (Object.keys(change.vars).length > 0) {
      const varsStr = Object.entries(change.vars).map(([k, v]) => `\`${k}=${v}\``).join(", ");
      lines.push(`- **Vars:** ${varsStr}`);
    }

    if (change.diff) {
      const { matches, changed, missing, new: added } = change.diff.summary;
      lines.push(`- **Diff:** ${matches} match, ${changed} changed, ${missing} missing, ${added} new`);
    }

    if (change.inputs !== undefined) {
      lines.push(`\n<details><summary>Inputs</summary>\n`);
      lines.push("```json");
      lines.push(JSON.stringify(change.inputs, null, 2));
      lines.push("```\n");
      lines.push("</details>");
    }

    lines.push("");
  }

  const markdown = lines.join("\n");

  if (opts.out) {
    await writeFile(opts.out, markdown);
    console.log(`Exported ${summaries.length} change${summaries.length === 1 ? "" : "s"} to ${bold(opts.out)}`);
  } else {
    console.log(markdown);
  }
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
