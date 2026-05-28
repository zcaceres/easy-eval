import { describe, test, expect, beforeAll, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, rmSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const REPO_ROOT = join(import.meta.dir, "..");
const BINARY = process.env.EE_BINARY ?? join(REPO_ROOT, "dist", "ee");

async function run(
  args: string[],
  cwd: string,
  opts: { stdin?: string } = {},
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

    const config = readFileSync(join(tmp, "ee.config.ts"), "utf8");
    expect(config).toContain('from "easy-eval"');
  });

  test("eval runs scaffolded config WITHOUT node_modules (virtual module shim)", async () => {
    await run(["init"], tmp);
    expect(existsSync(join(tmp, "node_modules"))).toBe(false);

    const { stdout, stderr, exitCode } = await run(["eval", "my-dataset"], tmp);
    expect(exitCode).toBe(0);
    expect(stderr).not.toContain("Cannot find package");
    expect(stdout).toContain("my-dataset");
    expect(stdout).toContain("Result for my-dataset");

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

    // eval prompts "Codify this change? [y/N]" — piping "n" exits cleanly
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
