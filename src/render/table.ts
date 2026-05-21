import type { DiffResult, SectionDiff, DetailRow, RowStatus } from "../types";
import { bold, cyan, magenta, dim, green, yellow, red } from "./colors";

export function renderDiffTable(diff: DiffResult): string {
  const lines: string[] = [];
  const W_LABEL = 20;
  const W_COL = 10;

  const header = `${bold("Section".padEnd(W_LABEL))} ${cyan("Golden".padStart(W_COL))} ${magenta("Eval".padStart(W_COL))} ${"Delta".padStart(W_COL)}`;
  lines.push(header);
  lines.push(dim("─".repeat(W_LABEL + W_COL * 3 + 3)));

  for (const s of diff.sections) {
    lines.push(
      `${s.label.padEnd(W_LABEL)} ${String(s.goldenCount).padStart(W_COL)} ${String(s.evalCount).padStart(W_COL)} ${colorDelta(s.delta).padStart(W_COL)}`,
    );
  }

  lines.push(dim("─".repeat(W_LABEL + W_COL * 3 + 3)));

  const { matches, changed, missing, new: added } = diff.summary;
  lines.push(`${dim(String(matches))} match, ${changed ? yellow(String(changed)) : dim("0")} changed, ${missing ? red(String(missing)) : dim("0")} missing, ${added ? green(String(added)) : dim("0")} new`);

  return lines.join("\n");
}

function colorDelta(delta: string): string {
  if (delta.startsWith("+")) return green(delta);
  if (delta.startsWith("-")) return red(delta);
  return dim(delta);
}

export function renderDetailedDiff(diff: DiffResult): string {
  const sections: string[] = [];

  for (const s of diff.sections) {
    sections.push(renderSection(s));
  }

  return sections.join("\n\n");
}

function renderSection(section: SectionDiff): string {
  const lines: string[] = [];
  lines.push(`${dim("──")} ${bold(section.label)} ${dim(`(${section.goldenCount} → ${section.evalCount}, ${section.delta})`)} ${dim("─".repeat(Math.max(0, 56 - section.label.length)))}`);

  if (section.rows.length === 0) {
    lines.push(dim("  (empty)"));
    return lines.join("\n");
  }

  const W_KEY = 28;
  const W_VAL = 24;
  lines.push(`  ${"".padEnd(W_KEY)} ${cyan("Golden".padEnd(W_VAL))} ${magenta("Eval".padEnd(W_VAL))}`);

  for (const r of section.rows) {
    const glyph = statusGlyph(r.status);
    const key = trunc(r.key, W_KEY - 1).padEnd(W_KEY);
    const gv = trunc(r.golden, W_VAL - 1).padEnd(W_VAL);
    const ev = trunc(r.eval, W_VAL - 1).padEnd(W_VAL);
    lines.push(`${glyph}${key} ${gv} ${ev}`);
  }

  return lines.join("\n");
}

function statusGlyph(s: RowStatus): string {
  switch (s) {
    case "match": return dim("  ");
    case "changed": return yellow("~ ");
    case "missing": return red("- ");
    case "new": return green("+ ");
  }
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
