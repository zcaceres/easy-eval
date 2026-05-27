// ─── Config types ──────────────────────────────────────────────────────

export interface EvalConfig {
  evals: Record<string, EvalDef>;
  storage?: StorageConfig;
}

export interface StorageConfig {
  dir?: string;
}

export interface EvalDef {
  eval: (ctx: EvalContext) => Promise<unknown>;
  inputs?: (datasetId: string) => Promise<unknown>;
  diffSchema?: DiffSchema;
}

// ─── Eval context (passed to the user's run function) ──────────────

export interface EvalContext {
  datasetId: string;
  inputs: unknown;
  vars: Record<string, string>;
  reportCost: (cost: CostReport) => void;
  reportMeta: (key: string, value: unknown) => void;
}

export interface CostReport {
  total: number;
  breakdown?: Record<
    string,
    {
      input?: number;
      output?: number;
      cacheRead?: number;
      cost: number;
    }
  >;
}

// ─── Diff schema types ─────────────────────────────────────────────

export interface DiffSchema {
  sections: SectionConfig[];
}

export type SectionConfig =
  | ScalarSection
  | KeyedArraySection
  | SetSection
  | OrderedArraySection;

interface BaseSectionConfig {
  path: string;
  label: string;
}

export interface ScalarSection extends BaseSectionConfig {
  kind: "scalar";
  eq?: (golden: unknown, eval_: unknown) => boolean;
  display?: (value: unknown) => string;
}

export interface KeyedArraySection extends BaseSectionConfig {
  kind: "keyed-array";
  key: string | ((item: unknown) => string);
  eq?: (golden: unknown, eval_: unknown) => boolean;
  display?: (item: unknown) => string;
}

export interface SetSection extends BaseSectionConfig {
  kind: "set";
  identity?: (item: unknown) => string;
  display?: (item: unknown) => string;
}

export interface OrderedArraySection extends BaseSectionConfig {
  kind: "ordered-array";
  display?: (item: unknown) => string;
}

// ─── Golden ────────────────────────────────────────────────────────

export interface Golden<TOutput = unknown> {
  blessedAt: string;
  datasetId: string;
  worker: string;
  tag?: string;
  output: TOutput;
  metadata?: Record<string, unknown>;
}

// ─── Eval Run Snapshot ─────────────────────────────────────────────

export interface EvalRun<TOutput = unknown> {
  timestamp: string;
  datasetId: string;
  worker: string;
  durationMs: number;
  cost?: CostReport;
  metadata?: Record<string, unknown>;
  output: TOutput;
}

// ─── Diff Result ───────────────────────────────────────────────────

export type RowStatus = "match" | "changed" | "missing" | "new";

export interface DetailRow {
  status: RowStatus;
  key: string;
  golden: string;
  eval: string;
}

export interface SectionDiff {
  label: string;
  path: string;
  goldenCount: number | string;
  evalCount: number | string;
  delta: string;
  rows: DetailRow[];
}

export interface DiffResult {
  sections: SectionDiff[];
  summary: {
    matches: number;
    changed: number;
    missing: number;
    new: number;
  };
}

// ─── Change (codified improvement) ────────────────────────────────

export interface Change {
  timestamp: string;
  datasetId: string;
  worker: string;
  runTimestamp: string;
  inputs: unknown;
  vars: Record<string, string>;
  diff?: DiffResult;
  note?: string;
  metadata?: Record<string, unknown>;
}

// ─── Sweep Result ─────────────────────────────────────────────────

export interface SweepDatasetResult {
  datasetId: string;
  status: "clean" | "regression" | "skipped" | "error";
  diff?: DiffResult;
  durationMs?: number;
  cost?: CostReport;
  error?: string;
}

// ─── defineConfig helper ───────────────────────────────────────────

export function defineConfig(config: EvalConfig): EvalConfig {
  return config;
}
