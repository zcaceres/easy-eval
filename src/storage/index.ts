import { join } from "path";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import type { Golden, EvalRun } from "../types";
import {
  goldenPath,
  runsDir,
  reportsDir,
  tsToFilename,
  filenameToTs,
} from "./paths";

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

// ─── Golden ────────────────────────────────────────────────────────

export async function saveGolden(
  storageRoot: string,
  worker: string,
  datasetId: string,
  golden: Golden,
): Promise<void> {
  const path = goldenPath(storageRoot, worker, datasetId);
  await ensureDir(join(path, ".."));
  await writeFile(path, JSON.stringify(golden, null, 2));
}

export async function loadGolden(
  storageRoot: string,
  worker: string,
  datasetId: string,
): Promise<Golden | null> {
  try {
    const raw = await readFile(goldenPath(storageRoot, worker, datasetId), "utf-8");
    return JSON.parse(raw) as Golden;
  } catch {
    return null;
  }
}

// ─── Runs ──────────────────────────────────────────────────────────

export async function saveRun(
  storageRoot: string,
  worker: string,
  datasetId: string,
  run: EvalRun,
): Promise<void> {
  const dir = runsDir(storageRoot, worker, datasetId);
  await ensureDir(dir);
  const filename = `${tsToFilename(run.timestamp)}.json`;
  await writeFile(join(dir, filename), JSON.stringify(run, null, 2));
}

export async function loadRun(
  storageRoot: string,
  worker: string,
  datasetId: string,
  timestamp: string,
): Promise<EvalRun | null> {
  try {
    const filename = `${tsToFilename(timestamp)}.json`;
    const raw = await readFile(join(runsDir(storageRoot, worker, datasetId), filename), "utf-8");
    return JSON.parse(raw) as EvalRun;
  } catch {
    return null;
  }
}

export interface RunSummary {
  timestamp: string;
  durationMs: number;
  cost?: number;
}

export async function listRuns(
  storageRoot: string,
  worker: string,
  datasetId: string,
): Promise<RunSummary[]> {
  const dir = runsDir(storageRoot, worker, datasetId);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const summaries: RunSummary[] = [];
  for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
    try {
      const raw = await readFile(join(dir, file), "utf-8");
      const run = JSON.parse(raw) as EvalRun;
      summaries.push({
        timestamp: run.timestamp,
        durationMs: run.durationMs,
        cost: run.cost?.total,
      });
    } catch {
      // skip corrupt files
    }
  }
  return summaries;
}

export async function loadLatestRun(
  storageRoot: string,
  worker: string,
  datasetId: string,
): Promise<EvalRun | null> {
  const runs = await listRuns(storageRoot, worker, datasetId);
  if (runs.length === 0) return null;
  const latest = runs[runs.length - 1]!;
  return loadRun(storageRoot, worker, datasetId, latest.timestamp);
}

// ─── Reports ───────────────────────────────────────────────────────

export async function saveReport(
  storageRoot: string,
  worker: string,
  datasetId: string,
  timestamp: string,
  markdown: string,
): Promise<string> {
  const dir = reportsDir(storageRoot, worker, datasetId);
  await ensureDir(dir);
  const filename = `${tsToFilename(timestamp)}.md`;
  const filepath = join(dir, filename);
  await writeFile(filepath, markdown);
  return filepath;
}

// ─── Discovery ─────────────────────────────────────────────────────

export interface DatasetInfo {
  datasetId: string;
  worker: string;
  hasGolden: boolean;
  goldenBlessedAt?: string;
  runCount: number;
  latestRunTimestamp?: string;
}

export async function discoverDatasets(
  storageRoot: string,
): Promise<DatasetInfo[]> {
  const results: DatasetInfo[] = [];

  let workerDirs: string[];
  try {
    workerDirs = await readdir(storageRoot);
  } catch {
    return [];
  }

  for (const workerName of workerDirs) {
    const workerPath = join(storageRoot, workerName);
    let datasetDirs: string[];
    try {
      datasetDirs = await readdir(workerPath);
    } catch {
      continue;
    }

    for (const dsId of datasetDirs) {
      const golden = await loadGolden(storageRoot, workerName, dsId);
      const runs = await listRuns(storageRoot, workerName, dsId);

      results.push({
        datasetId: dsId,
        worker: workerName,
        hasGolden: golden !== null,
        goldenBlessedAt: golden?.blessedAt,
        runCount: runs.length,
        latestRunTimestamp: runs.length > 0 ? runs[runs.length - 1]!.timestamp : undefined,
      });
    }
  }

  return results;
}
