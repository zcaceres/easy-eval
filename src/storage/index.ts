import { join } from "path";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import type { Golden, EvalRun, Change } from "../types";
import {
  goldenPath,
  runsDir,
  reportsDir,
  changesDir,
  tsToFilename,
  filenameToTs,
  RESERVED_WORKER_NAMES,
} from "./paths";

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

// `Date.toISOString()` has millisecond resolution. Two evals firing in the same
// ms (fast/mocked eval fns, agent loops, concurrent CLI invocations) would
// otherwise silently overwrite each other's run file. We open with `wx` (atomic
// exclusive create) and, on EEXIST, bump the timestamp by 1ms and retry. The
// caller learns the actually-used timestamp so its in-memory copy stays in sync
// with what's on disk.
const WRITE_UNIQUE_MAX_ATTEMPTS = 100;

async function writeUnique(
  dir: string,
  baseTs: string,
  body: string,
  ext: string,
): Promise<string> {
  let ts = baseTs;
  for (let attempt = 0; attempt < WRITE_UNIQUE_MAX_ATTEMPTS; attempt++) {
    const target = join(dir, `${tsToFilename(ts)}${ext}`);
    try {
      await writeFile(target, body, { flag: "wx" });
      return ts;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== "EEXIST") throw err;
      ts = new Date(new Date(ts).getTime() + 1).toISOString();
    }
  }
  throw new Error(
    `Could not allocate a unique filename in ${dir} after ${WRITE_UNIQUE_MAX_ATTEMPTS} attempts`,
  );
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
  const usedTs = await writeUnique(dir, run.timestamp, JSON.stringify(run, null, 2), ".json");
  if (usedTs !== run.timestamp) run.timestamp = usedTs;
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
  for (const file of files.filter((f) => f.endsWith(".json"))) {
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
  // Sort by parsed timestamp, not filename. Filename sort is fine today
  // (ISO 8601 sorts lexicographically), but a hand-edited or non-ISO
  // `run.timestamp` would make "latest" silently wrong.
  summaries.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
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
  const usedTs = await writeUnique(dir, timestamp, markdown, ".md");
  return join(dir, `${tsToFilename(usedTs)}.md`);
}

// ─── Changes ──────────────────────────────────────────────────────

export async function saveChange(
  storageRoot: string,
  change: Change,
): Promise<void> {
  const dir = changesDir(storageRoot);
  await ensureDir(dir);
  const usedTs = await writeUnique(dir, change.timestamp, JSON.stringify(change, null, 2), ".json");
  if (usedTs !== change.timestamp) change.timestamp = usedTs;
}

export async function loadChange(
  storageRoot: string,
  timestamp: string,
): Promise<Change | null> {
  try {
    const filename = `${tsToFilename(timestamp)}.json`;
    const raw = await readFile(join(changesDir(storageRoot), filename), "utf-8");
    return JSON.parse(raw) as Change;
  } catch {
    return null;
  }
}

export interface ChangeSummary {
  timestamp: string;
  datasetId: string;
  worker: string;
  note?: string;
  vars: Record<string, string>;
}

export async function listChanges(
  storageRoot: string,
  datasetId?: string,
): Promise<ChangeSummary[]> {
  const dir = changesDir(storageRoot);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const summaries: ChangeSummary[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const raw = await readFile(join(dir, file), "utf-8");
      const change = JSON.parse(raw) as Change;
      if (datasetId && change.datasetId !== datasetId) continue;
      summaries.push({
        timestamp: change.timestamp,
        datasetId: change.datasetId,
        worker: change.worker,
        note: change.note,
        vars: change.vars,
      });
    } catch {
      // skip corrupt files
    }
  }
  summaries.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return summaries;
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
    // Skip reserved top-level dirs (e.g. `changes/`), dotfiles, and anything
    // that isn't a directory — these used to pollute `vibecheck status`.
    if (RESERVED_WORKER_NAMES.has(workerName)) continue;
    if (workerName.startsWith(".")) continue;
    const workerPath = join(storageRoot, workerName);
    const st = await stat(workerPath).catch(() => null);
    if (!st?.isDirectory()) continue;

    let datasetDirs: string[];
    try {
      datasetDirs = await readdir(workerPath);
    } catch {
      continue;
    }

    for (const dsId of datasetDirs) {
      if (dsId.startsWith(".")) continue;
      const dsPath = join(workerPath, dsId);
      const dsSt = await stat(dsPath).catch(() => null);
      if (!dsSt?.isDirectory()) continue;
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
