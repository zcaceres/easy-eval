import type { DiffResult, SectionDiff, DetailRow, RowStatus } from "../types";

export function renderDiffTable(diff: DiffResult): string {
  const lines: string[] = [];
  const W_LABEL = 20;
  const W_COL = 10;

  const header = `${"Section".padEnd(W_LABEL)} ${"Golden".padStart(W_COL)} ${"Eval".padStart(W_COL)} ${"Delta".padStart(W_COL)}`;
  lines.push(header);
  lines.push("─".repeat(header.length));

  for (const s of diff.sections) {
    lines.push(
      `${s.label.padEnd(W_LABEL)} ${String(s.goldenCount).padStart(W_COL)} ${String(s.evalCount).padStart(W_COL)} ${s.delta.padStart(W_COL)}`,
    );
  }

  lines.push("─".repeat(header.length));

  const { matches, changed, missing, new: added } = diff.summary;
  lines.push(`${matches} match, ${changed} changed, ${missing} missing, ${added} new`);

  return lines.join("\n");
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
  lines.push(`── ${section.label} (${section.goldenCount} → ${section.evalCount}, ${section.delta}) ${"─".repeat(Math.max(0, 56 - section.label.length))}`);

  if (section.rows.length === 0) {
    lines.push("  (empty)");
    return lines.join("\n");
  }

  const W_KEY = 28;
  const W_VAL = 24;
  lines.push(`  ${"".padEnd(W_KEY)} ${"Golden".padEnd(W_VAL)} ${"Eval".padEnd(W_VAL)}`);

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
    case "match": return "  ";
    case "changed": return "~ ";
    case "missing": return "- ";
    case "new": return "+ ";
  }
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
