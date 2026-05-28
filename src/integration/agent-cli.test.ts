import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, writeFile, stat } from "fs/promises";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { saveGolden, saveRun, saveChange } from "../storage/index";
import type { Golden, EvalRun, Change } from "../types";

// All CLI subprocesses run with cwd set to a temp directory.
// The config inside that temp dir uses storage: { dir: ".ee" }, which
// getStorageRoot resolves relative to cwd — so all reads and writes
// land in $TMPDIR/ee-test-xxx/.ee/, never in the project tree.

const CLI_PATH = join(import.meta.dir, "..", "cli.ts");
const PROJECT_ROOT = resolve(import.meta.dir, "..", "..");

let tmpDir: string;
let storageRoot: string;
let projectEeMtimeBefore: number | null;

const GOLDEN_OUTPUT = {
  name: "Test Restaurant",
  rating: 4.5,
  items: ["pizza", "pasta", "salad"],
};

const EVAL_OUTPUT = {
  name: "Test Restaurant",
  rating: 4.7,
  items: ["pizza", "pasta"],
};

const RUN_TIMESTAMP = "2026-01-15T10:30:00.000Z";
const SECOND_RUN_TIMESTAMP = "2026-01-15T11:00:00.000Z";
const CHANGE_TIMESTAMP = "2026-01-15T10:30:01.000Z";

async function runCli(...args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    cwd: tmpDir,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Failed to parse JSON from stdout:\n${stdout}`);
  }
}

async function getDirMtime(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}

beforeAll(async () => {
  projectEeMtimeBefore = await getDirMtime(join(PROJECT_ROOT, ".ee"));

  tmpDir = await mkdtemp(join(tmpdir(), "ee-test-"));
  storageRoot = join(tmpDir, ".ee");

  const configContent = `
export default {
  evals: {
    default: {
      eval: async (ctx) => ({
        name: "Test Restaurant",
        rating: 4.7,
        items: ["pizza", "pasta"],
      }),
      inputs: async (datasetId) => ({
        restaurantId: datasetId,
        reviews: ["Great food!", "Loved the pizza"],
      }),
    },
  },
  storage: { dir: ".ee" },
};
`;
  await writeFile(join(tmpDir, "ee.config.ts"), configContent);

  const golden: Golden = {
    blessedAt: "2026-01-10T08:00:00.000Z",
    datasetId: "test-dataset",
    worker: "default",
    output: GOLDEN_OUTPUT,
  };
  await saveGolden(storageRoot, "default", "test-dataset", golden);

  const run: EvalRun = {
    timestamp: RUN_TIMESTAMP,
    datasetId: "test-dataset",
    worker: "default",
    durationMs: 1234,
    cost: { total: 0.0042, breakdown: { "gpt-4o": { input: 100, output: 50, cacheRead: 0, cost: 0.0042 } } },
    vars: { model: "gpt-4o", temperature: "0.5" },
    inputs: { restaurantId: "test-dataset", reviews: ["Great food!"] },
    output: EVAL_OUTPUT,
  };
  await saveRun(storageRoot, "default", "test-dataset", run);

  const secondRun: EvalRun = {
    timestamp: SECOND_RUN_TIMESTAMP,
    datasetId: "test-dataset",
    worker: "default",
    durationMs: 987,
    vars: { model: "claude-sonnet" },
    output: { ...EVAL_OUTPUT, rating: 4.8 },
  };
  await saveRun(storageRoot, "default", "test-dataset", secondRun);

  const goldenNoRuns: Golden = {
    blessedAt: "2026-01-12T08:00:00.000Z",
    datasetId: "empty-dataset",
    worker: "default",
    output: { name: "Empty" },
  };
  await saveGolden(storageRoot, "default", "empty-dataset", goldenNoRuns);

  const change: Change = {
    timestamp: CHANGE_TIMESTAMP,
    datasetId: "test-dataset",
    worker: "default",
    runTimestamp: RUN_TIMESTAMP,
    inputs: { restaurantId: "test-dataset", reviews: ["Great food!"] },
    vars: { model: "gpt-4o" },
    diff: {
      sections: [
        {
          label: "Root",
          path: "",
          goldenCount: 3,
          evalCount: 3,
          delta: "~",
          rows: [
            { status: "match", key: "name", golden: "Test Restaurant", eval: "Test Restaurant" },
            { status: "changed", key: "rating", golden: "4.5", eval: "4.7" },
          ],
        },
      ],
      summary: { matches: 1, changed: 1, missing: 1, new: 0 },
    },
    note: "Rating improved slightly",
    metadata: { source: "test" },
  };
  await saveChange(storageRoot, change);
});

afterAll(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ─── Isolation Guard ─────────────────────────────────────────────

describe("test isolation", () => {
  test("all file operations target temp directory, not project tree", async () => {
    expect(tmpDir.startsWith(tmpdir())).toBe(true);
    expect(storageRoot.startsWith(tmpDir)).toBe(true);

    const currentMtime = await getDirMtime(join(PROJECT_ROOT, ".ee"));
    expect(currentMtime).toBe(projectEeMtimeBefore);
  });
});

// ─── JSON Output Format Tests ────────────────────────────────────

describe("ee eval -f json", () => {
  test("returns structured JSON with run, verdict, and golden", async () => {
    const { stdout, exitCode } = await runCli("eval", "test-dataset", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result).toHaveProperty("run");
    expect(result).toHaveProperty("verdict");
    expect(result).toHaveProperty("golden");

    expect(result.run.datasetId).toBe("test-dataset");
    expect(result.run.worker).toBe("default");
    expect(typeof result.run.timestamp).toBe("string");
    expect(typeof result.run.durationMs).toBe("number");
    expect(result.run.output).toEqual(EVAL_OUTPUT);

    expect(result.golden).not.toBeNull();
    expect(result.golden.blessedAt).toBe("2026-01-10T08:00:00.000Z");

    expect(result.verdict).not.toBeNull();
    expect(result.verdict.diff).toHaveProperty("sections");
    expect(result.verdict.diff).toHaveProperty("summary");
    expect(result.verdict).toHaveProperty("pass");
    expect(result.verdict).toHaveProperty("summary");
  });

  test("includes vars and inputs in the run object", async () => {
    const { stdout, exitCode } = await runCli("eval", "test-dataset", "-f", "json", "-v", "model=test-model");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.run.vars).toEqual({ model: "test-model" });
    expect(result.run.inputs).toEqual({
      restaurantId: "test-dataset",
      reviews: ["Great food!", "Loved the pizza"],
    });
  });

  test("returns null verdict and golden with --no-diff", async () => {
    const { stdout, exitCode } = await runCli("eval", "test-dataset", "--no-diff", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.run.output).toEqual(EVAL_OUTPUT);
    expect(result.verdict).toBeNull();
    expect(result.golden).toBeNull();
  });

  test("returns null golden when no golden exists", async () => {
    const { stdout, exitCode } = await runCli("eval", "no-golden-dataset", "--no-diff", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.golden).toBeNull();
  });

  test("outputs no ANSI escape codes in json mode", async () => {
    const { stdout } = await runCli("eval", "test-dataset", "-f", "json");
    expect(stdout).not.toMatch(/\x1b\[/);
  });
});

describe("ee report -f json", () => {
  test("returns structured JSON with run, golden, and diff", async () => {
    const { stdout, exitCode } = await runCli("report", "test-dataset", RUN_TIMESTAMP, "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result).toHaveProperty("run");
    expect(result).toHaveProperty("golden");
    expect(result).toHaveProperty("diff");

    expect(result.run.timestamp).toBe(RUN_TIMESTAMP);
    expect(result.run.worker).toBe("default");
    expect(result.run.durationMs).toBe(1234);

    expect(result.golden.blessedAt).toBe("2026-01-10T08:00:00.000Z");

    expect(result.diff).not.toBeNull();
    expect(result.diff.summary).toHaveProperty("matches");
    expect(result.diff.summary).toHaveProperty("changed");
  });

  test("returns specific run when timestamp is provided", async () => {
    const { stdout, exitCode } = await runCli("report", "test-dataset", SECOND_RUN_TIMESTAMP, "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.run.timestamp).toBe(SECOND_RUN_TIMESTAMP);
  });
});

describe("ee runs -f json", () => {
  test("returns run list with datasetId and worker", async () => {
    const { stdout, exitCode } = await runCli("runs", "test-dataset", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.datasetId).toBe("test-dataset");
    expect(result.worker).toBe("default");
    expect(Array.isArray(result.runs)).toBe(true);
    expect(result.runs.length).toBeGreaterThanOrEqual(2);

    const seededRun = result.runs.find((r: any) => r.timestamp === RUN_TIMESTAMP);
    expect(seededRun).toBeDefined();
    expect(seededRun.durationMs).toBe(1234);
    expect(seededRun.cost).toBe(0.0042);
  });

  test("returns empty runs array for dataset with no runs", async () => {
    const { stdout, exitCode } = await runCli("runs", "empty-dataset", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.runs).toEqual([]);
  });
});

describe("ee status -f json", () => {
  test("returns datasets array with discovery info", async () => {
    const { stdout, exitCode } = await runCli("status", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(Array.isArray(result.datasets)).toBe(true);

    const testDs = result.datasets.find((d: any) => d.datasetId === "test-dataset");
    expect(testDs).toBeDefined();
    expect(testDs.worker).toBe("default");
    expect(testDs.hasGolden).toBe(true);
    expect(testDs.runCount).toBeGreaterThanOrEqual(2);

    const emptyDs = result.datasets.find((d: any) => d.datasetId === "empty-dataset");
    expect(emptyDs).toBeDefined();
    expect(emptyDs.hasGolden).toBe(true);
    expect(emptyDs.runCount).toBe(0);
  });
});

describe("ee changes list -f json", () => {
  test("returns changes array with summaries", async () => {
    const { stdout, exitCode } = await runCli("changes", "list", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(Array.isArray(result.changes)).toBe(true);
    expect(result.changes.length).toBeGreaterThanOrEqual(1);

    const seeded = result.changes.find((c: any) => c.timestamp === CHANGE_TIMESTAMP);
    expect(seeded).toBeDefined();
    expect(seeded.datasetId).toBe("test-dataset");
    expect(seeded.worker).toBe("default");
    expect(seeded.note).toBe("Rating improved slightly");
    expect(seeded.vars).toEqual({ model: "gpt-4o" });
  });

  test("filters by dataset", async () => {
    const { stdout, exitCode } = await runCli("changes", "list", "-d", "nonexistent-dataset", "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.changes).toEqual([]);
  });
});

describe("ee changes show -f json", () => {
  test("returns full change object", async () => {
    const { stdout, exitCode } = await runCli("changes", "show", CHANGE_TIMESTAMP, "-f", "json");
    expect(exitCode).toBe(0);

    const result = parseJson(stdout) as any;
    expect(result.timestamp).toBe(CHANGE_TIMESTAMP);
    expect(result.datasetId).toBe("test-dataset");
    expect(result.worker).toBe("default");
    expect(result.runTimestamp).toBe(RUN_TIMESTAMP);
    expect(result.note).toBe("Rating improved slightly");
    expect(result.vars).toEqual({ model: "gpt-4o" });
    expect(result.inputs).toEqual({ restaurantId: "test-dataset", reviews: ["Great food!"] });
    expect(result.diff).toHaveProperty("sections");
    expect(result.diff).toHaveProperty("summary");
    expect(result.metadata).toEqual({ source: "test" });
  });
});

// ─── ee changes add ──────────────────────────────────────────────

describe("ee changes add", () => {
  test("creates a change from latest run", async () => {
    const { stdout, stderr, exitCode } = await runCli("changes", "add", "test-dataset", "--note", "added by agent");
    expect(exitCode).toBe(0);
    expect(stdout + stderr).toContain("Change saved");

    const { stdout: listOut } = await runCli("changes", "list", "-f", "json");
    const result = parseJson(listOut) as any;
    const added = result.changes.find((c: any) => c.note === "added by agent");
    expect(added).toBeDefined();
    expect(added.datasetId).toBe("test-dataset");
  });

  test("creates a change from specific run timestamp", async () => {
    const { exitCode } = await runCli("changes", "add", "test-dataset", RUN_TIMESTAMP, "--note", "specific run");
    expect(exitCode).toBe(0);

    const { stdout: listOut } = await runCli("changes", "list", "-f", "json");
    const result = parseJson(listOut) as any;
    const added = result.changes.find((c: any) => c.note === "specific run");
    expect(added).toBeDefined();
  });

  test("creates a change without a note", async () => {
    const { exitCode } = await runCli("changes", "add", "test-dataset");
    expect(exitCode).toBe(0);
  });
});

// ─── Error Handling (Agent Mistake Recovery) ─────────────────────

describe("error handling for agent mistakes", () => {
  test("report with nonexistent dataset gives helpful error", async () => {
    const { stderr, exitCode } = await runCli("report", "does-not-exist");
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("No eval run");
  });

  test("report with bad timestamp gives helpful error", async () => {
    const { stderr, exitCode } = await runCli("report", "test-dataset", "not-a-timestamp");
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("No eval run");
  });

  test("changes show with nonexistent timestamp gives helpful error", async () => {
    const { stderr, exitCode } = await runCli("changes", "show", "2099-01-01T00:00:00.000Z");
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("No change found");
  });

  test("changes add with no runs gives helpful error", async () => {
    const { stderr, exitCode } = await runCli("changes", "add", "empty-dataset");
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("No eval run");
  });

  test("eval with nonexistent worker gives helpful error", async () => {
    const { stderr, exitCode } = await runCli("eval", "test-dataset", "-w", "nonexistent");
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("not found");
    expect(stderr).toContain("Available:");
  });

  test("changes add with bad worker gives helpful error", async () => {
    const { stderr, exitCode } = await runCli("changes", "add", "test-dataset", "-w", "nonexistent");
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("not found");
    expect(stderr).toContain("Available:");
  });
});
