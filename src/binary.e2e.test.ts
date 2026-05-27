import { describe, test, expect, beforeAll, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, rmSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";

// Path to the compiled binary. Override with EE_BINARY env var
// (used in the release workflow where the binary name is platform-specific).
const REPO_ROOT = join(import.meta.dir, "..");
const BINARY = process.env.EE_BINARY ?? join(REPO_ROOT, "dist", "ee");

async function run(
  args: string[],
  cwd: string,
  opts: { stdin?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn([BINARY, ...args], {
    cwd,
    stdin: opts.stdin !== undefined ? new TextEncoder().encode(opts.stdin) : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe("compiled ee binary e2e", () => {
  let tmp: string;

  beforeAll(async () => {
    if (!existsSync(BINARY)) {
      // Auto-compile for host platform if no binary exists yet.
      const proc = Bun.spawn(["bun", "run", "compile"], {
        cwd: REPO_ROOT,
        stdout: "inherit",
        stderr: "inherit",
      });
      const code = await proc.exited;
      if (code !== 0) throw new Error(`compile failed with exit code ${code}`);
    }
  });

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "ee-e2e-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("--help prints usage", async () => {
    const { stdout, exitCode } = await run(["--help"], tmp);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: ee");
    expect(stdout).toContain("eval");
    expect(stdout).toContain("bless");
  });

  test("--version prints a version", async () => {
    const { stdout, exitCode } = await run(["--version"], tmp);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("init scaffolds ee.config.ts and .ee/", async () => {
    const { exitCode } = await run(["init"], tmp);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tmp, "ee.config.ts"))).toBe(true);
    expect(existsSync(join(tmp, ".ee"))).toBe(true);

    // The scaffolded config imports from "easy-eval" — the very thing the
    // virtual-module shim in src/cli.ts is needed to resolve at runtime.
    const config = readFileSync(join(tmp, "ee.config.ts"), "utf8");
    expect(config).toContain('from "easy-eval"');
  });

  test("eval runs scaffolded config WITHOUT node_modules (virtual module shim)", async () => {
    // This is the critical test: no `bun install` happens in tmp, so the
    // only way `import { defineConfig } from "easy-eval"` can resolve is
    // via the Bun.plugin virtual module registered in src/cli.ts.
    await run(["init"], tmp);
    expect(existsSync(join(tmp, "node_modules"))).toBe(false);

    const { stdout, stderr, exitCode } = await run(["eval", "my-dataset"], tmp);
    expect(exitCode).toBe(0);
    expect(stderr).not.toContain("Cannot find package");
    expect(stdout).toContain("my-dataset");
    expect(stdout).toContain("Result for my-dataset");

    // Run file written to disk.
    const runsDir = join(tmp, ".ee", "default", "my-dataset", "runs");
    expect(existsSync(runsDir)).toBe(true);
    expect(readdirSync(runsDir).length).toBeGreaterThan(0);
  });

  test("bless promotes run to golden, then eval diffs against it", async () => {
    await run(["init"], tmp);
    await run(["eval", "my-dataset"], tmp);

    const blessRes = await run(["bless", "my-dataset"], tmp);
    expect(blessRes.exitCode).toBe(0);
    expect(existsSync(join(tmp, ".ee", "default", "my-dataset", "golden.json"))).toBe(true);

    // Re-eval with golden present. The eval command prompts "Codify this
    // change? [y/N]" at the end; piping "n" answers no and exits cleanly.
    const evalRes = await run(["eval", "my-dataset"], tmp, { stdin: "n\n" });
    expect(evalRes.exitCode).toBe(0);
    expect(evalRes.stdout).toContain("title");
    expect(evalRes.stdout).toContain("items");
  });

  test("status lists scaffolded dataset", async () => {
    await run(["init"], tmp);
    await run(["eval", "my-dataset"], tmp);
    const { stdout, exitCode } = await run(["status"], tmp);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("my-dataset");
  });

  test("fails with helpful error when no config present", async () => {
    const { stderr, exitCode } = await run(["eval", "anything"], tmp);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("No ee.config.ts");
  });
});
