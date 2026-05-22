import type { DiffResult, SectionDiff, DetailRow, RowStatus, SweepDatasetResult } from "../types";
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

export function renderOutputTable(output: unknown, schema: import("../types").DiffSchema): string {
  const lines: string[] = [];
  const W_LABEL = 20;
  const W_VAL = 50;

  lines.push(`${bold("Section".padEnd(W_LABEL))} ${"Value".padEnd(W_VAL)}`);
  lines.push(dim("─".repeat(W_LABEL + W_VAL + 1)));

  for (const section of schema.sections) {
    const value = getPathForRender(output, section.path);
    const display = formatValue(value, section);
    lines.push(`${section.label.padEnd(W_LABEL)} ${trunc(display, W_VAL)}`);
  }

  return lines.join("\n");
}

function getPathForRender(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatValue(value: unknown, section: import("../types").SectionConfig): string {
  if (value === undefined || value === null) return dim("—");

  switch (section.kind) {
    case "scalar": {
      const display = section.display ?? defaultScalarDisplay;
      return display(value);
    }
    case "keyed-array":
    case "set":
    case "ordered-array": {
      if (!Array.isArray(value)) return String(value);
      const display = section.display ?? defaultItemDisplay;
      if (value.length <= 3) {
        return value.map((item) => display(item)).join(", ");
      }
      return value.slice(0, 3).map((item) => display(item)).join(", ") + dim(` (+${value.length - 3} more)`);
    }
  }
}

function defaultScalarDisplay(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(val);
}

function defaultItemDisplay(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  return JSON.stringify(item);
}

// ─── Sweep Table ──────────────────────────────────────────────────

export function renderSweepTable(results: SweepDatasetResult[]): string {
  const lines: string[] = [];
  const W_DS = 24;
  const W_NUM = 8;
  const W_DUR = 10;
  const W_COST = 10;
  const W_STATUS = 14;
  const totalWidth = W_DS + W_NUM * 4 + W_DUR + W_COST + W_STATUS + 7;

  const header = `${bold("Dataset".padEnd(W_DS))} ${"Match".padStart(W_NUM)} ${"Chgd".padStart(W_NUM)} ${"Miss".padStart(W_NUM)} ${"New".padStart(W_NUM)} ${"Duration".padStart(W_DUR)} ${"Cost".padStart(W_COST)} ${"Status".padEnd(W_STATUS)}`;
  lines.push(header);
  lines.push(dim("─".repeat(totalWidth)));

  for (const r of results) {
    if (r.status === "skipped" || r.status === "error") {
      const statusStr = r.status === "skipped" ? yellow("~ skipped") : red("x error");
      const dash = dim("—");
      lines.push(
        `${trunc(r.datasetId, W_DS - 1).padEnd(W_DS)} ${dash.padStart(W_NUM)} ${dash.padStart(W_NUM)} ${dash.padStart(W_NUM)} ${dash.padStart(W_NUM)} ${dash.padStart(W_DUR)} ${dash.padStart(W_COST)} ${statusStr}`,
      );
    } else {
      const s = r.diff!.summary;
      const dur = r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : "—";
      const cost = r.cost ? `$${r.cost.total.toFixed(4)}` : "—";
      const statusStr = r.status === "clean" ? green("ok") : red("x regress");

      lines.push(
        `${trunc(r.datasetId, W_DS - 1).padEnd(W_DS)} ${dim(String(s.matches).padStart(W_NUM))} ${s.changed > 0 ? yellow(String(s.changed).padStart(W_NUM)) : dim("0".padStart(W_NUM))} ${s.missing > 0 ? red(String(s.missing).padStart(W_NUM)) : dim("0".padStart(W_NUM))} ${s.new > 0 ? green(String(s.new).padStart(W_NUM)) : dim("0".padStart(W_NUM))} ${dim(dur.padStart(W_DUR))} ${dim(cost.padStart(W_COST))} ${statusStr}`,
      );
    }
  }

  lines.push(dim("─".repeat(totalWidth)));

  const cleanCount = results.filter((r) => r.status === "clean").length;
  const regCount = results.filter((r) => r.status === "regression").length;
  const skipCount = results.filter((r) => r.status === "skipped" || r.status === "error").length;
  const parts: string[] = [];
  if (cleanCount > 0) parts.push(green(`${cleanCount} clean`));
  if (regCount > 0) parts.push(red(`${regCount} regression${regCount > 1 ? "s" : ""}`));
  if (skipCount > 0) parts.push(yellow(`${skipCount} skipped`));
  lines.push(`${results.length} dataset${results.length !== 1 ? "s" : ""}: ${parts.join(", ")}`);

  return lines.join("\n");
}
