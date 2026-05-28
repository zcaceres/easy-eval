import { join } from "path";
import type { EvalConfig } from "../types";
import { validateIdentifier } from "../validation";

// Reserved top-level directory names inside the storage root that aren't workers.
// `discoverDatasets` skips these so they don't pollute `vibecheck status` output.
export const RESERVED_WORKER_NAMES = new Set(["changes"]);

export function getStorageRoot(config: EvalConfig, cwd: string = process.cwd()): string {
  return join(cwd, config.storage?.dir ?? ".vibecheck");
}

// Defense in depth: commands already validate at the CLI boundary, but
// re-validating here means any future caller that forgets cannot escape the
// storage root via path-traversal segments.
export function workerDir(root: string, worker: string): string {
  validateIdentifier(worker, "worker");
  return join(root, worker);
}

export function datasetDir(root: string, worker: string, datasetId: string): string {
  validateIdentifier(worker, "worker");
  validateIdentifier(datasetId, "datasetId");
  return join(root, worker, datasetId);
}

export function goldenPath(root: string, worker: string, datasetId: string): string {
  return join(datasetDir(root, worker, datasetId), "golden.json");
}

export function runsDir(root: string, worker: string, datasetId: string): string {
  return join(datasetDir(root, worker, datasetId), "runs");
}

export function reportsDir(root: string, worker: string, datasetId: string): string {
  return join(datasetDir(root, worker, datasetId), "reports");
}

export function changesDir(root: string): string {
  return join(root, "changes");
}

export function tsToFilename(ts: string): string {
  return ts.replace(/:/g, "-");
}

export function filenameToTs(filename: string): string {
  return filename.replace(/\.json$/, "").replace(/-/g, (m, offset: number, str: string) => {
    const tIndex = str.indexOf("T");
    return tIndex >= 0 && offset > tIndex ? ":" : m;
  });
}
