import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  saveRun,
  saveChange,
  listRuns,
  discoverDatasets,
  loadLatestRun,
} from "./index";
import type { EvalRun, Change } from "../types";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "vc-storage-"));
}

function makeRun(ts: string, datasetId = "ds-a", worker = "default"): EvalRun {
  return {
    timestamp: ts,
    datasetId,
    worker,
    durationMs: 1,
    output: { hello: "world" },
  };
}

describe("saveRun collision handling (C3)", () => {
  let root: string;
  beforeEach(() => { root = tmp(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  test("two concurrent saves with the same timestamp produce two distinct files", async () => {
    const ts = "2025-01-15T10:30:00.000Z";
    const a = makeRun(ts);
    const b = makeRun(ts);

    await Promise.all([
      saveRun(root, "default", "ds", a),
      saveRun(root, "default", "ds", b),
    ]);

    const files = readdirSync(join(root, "default", "ds", "runs"));
    expect(files).toHaveLength(2);
    // The two on-disk timestamps differ by at least 1ms.
    expect(a.timestamp).not.toBe(b.timestamp);
  });

  test("ten concurrent saves preserve all runs", async () => {
    const ts = "2025-01-15T10:30:00.000Z";
    const runs = Array.from({ length: 10 }, () => makeRun(ts));
    await Promise.all(runs.map((r) => saveRun(root, "default", "ds", r)));
    const files = readdirSync(join(root, "default", "ds", "runs"));
    expect(files).toHaveLength(10);
  });
});

describe("listRuns sort (W6)", () => {
  let root: string;
  beforeEach(() => { root = tmp(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  test("sorts by parsed timestamp, not filename", async () => {
    // Drop two files whose lex order disagrees with chronological order if a
    // hand-edited file uses a non-canonical (but still valid) timestamp.
    const dir = join(root, "default", "ds", "runs");
    mkdirSync(dir, { recursive: true });
    // Older but lex-greater filename because of the digit after the dash:
    writeFileSync(
      join(dir, "2025-01-15T10-30-00.999Z.json"),
      JSON.stringify(makeRun("2025-01-15T10:30:00.999Z")),
    );
    writeFileSync(
      join(dir, "2025-01-15T10-30-01.000Z.json"),
      JSON.stringify(makeRun("2025-01-15T10:30:01.000Z")),
    );

    const runs = await listRuns(root, "default", "ds");
    expect(runs).toHaveLength(2);
    expect(runs[0]!.timestamp).toBe("2025-01-15T10:30:00.999Z");
    expect(runs[1]!.timestamp).toBe("2025-01-15T10:30:01.000Z");

    const latest = await loadLatestRun(root, "default", "ds");
    expect(latest?.timestamp).toBe("2025-01-15T10:30:01.000Z");
  });
});

describe("discoverDatasets filtering (W1)", () => {
  let root: string;
  beforeEach(() => { root = tmp(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  test("skips reserved `changes/` directory", async () => {
    await saveRun(root, "default", "ds-a", makeRun("2025-01-15T10:30:00.000Z"));
    await saveChange(root, {
      timestamp: "2025-01-15T10:30:00.000Z",
      datasetId: "ds-a",
      worker: "default",
      runTimestamp: "2025-01-15T10:30:00.000Z",
      inputs: null,
      vars: {},
    } as Change);

    const datasets = await discoverDatasets(root);
    const workers = new Set(datasets.map((d) => d.worker));
    expect(workers.has("changes")).toBe(false);
    expect(workers.has("default")).toBe(true);
  });

  test("skips dotfiles and non-directories at worker level", async () => {
    await saveRun(root, "default", "ds-a", makeRun("2025-01-15T10:30:00.000Z"));
    writeFileSync(join(root, ".DS_Store"), "");
    writeFileSync(join(root, "stray-file.txt"), "");
    mkdirSync(join(root, ".hidden"), { recursive: true });

    const datasets = await discoverDatasets(root);
    const workers = new Set(datasets.map((d) => d.worker));
    expect(workers).toEqual(new Set(["default"]));
  });
});
