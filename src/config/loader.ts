import { basename, join, resolve, sep } from "path";
import { existsSync } from "fs";
import type { EvalConfig } from "../types";
import { VibecheckInputError, validateEvalDef } from "../validation";

const CONFIG_FILENAMES = ["vibecheck.config.ts", "vibecheck.config.js", "vibecheck.config.mjs"];
const CONFIG_BASENAME_RE = /^vibecheck\.config\.(ts|js|mjs)$/;

export async function loadConfig(configPath?: string): Promise<EvalConfig> {
  if (configPath) {
    const filepath = resolve(configPath);
    // --config does `await import(...)` which executes the file. Guard against
    // accidentally executing the wrong path (e.g. argv splatted from untrusted
    // input). Strict filename match + cwd-containment warning.
    if (!CONFIG_BASENAME_RE.test(basename(filepath))) {
      throw new VibecheckInputError(
        `--config must point to vibecheck.config.{ts,js,mjs}, got "${basename(filepath)}"`,
      );
    }
    if (!filepath.startsWith(process.cwd() + sep)) {
      console.error(
        `Warning: --config path "${filepath}" is outside the current directory.`,
      );
    }
    if (!existsSync(filepath)) {
      throw new VibecheckInputError(`Config file not found: ${filepath}`);
    }
    return importAndValidate(filepath);
  }

  const cwd = process.cwd();
  for (const filename of CONFIG_FILENAMES) {
    const filepath = join(cwd, filename);
    if (existsSync(filepath)) {
      return importAndValidate(filepath);
    }
  }

  throw new VibecheckInputError(
    "No vibecheck.config.ts found in current directory. Run `vibecheck init` to create one, or pass --config <path>.",
  );
}

async function importAndValidate(filepath: string): Promise<EvalConfig> {
  const mod = await import(filepath);
  const config = mod.default ?? mod;
  validateConfig(config);
  return config as EvalConfig;
}

function validateConfig(config: unknown): asserts config is EvalConfig {
  if (config === null || config === undefined || typeof config !== "object") {
    throw new VibecheckInputError("Config must export an object");
  }

  if (!("evals" in config) || config.evals === null || typeof config.evals !== "object") {
    throw new VibecheckInputError("Config must have an `evals` object");
  }

  const evals = config.evals as Record<string, unknown>;
  for (const [name, evalDef] of Object.entries(evals)) {
    if (evalDef === null || typeof evalDef !== "object") {
      throw new VibecheckInputError(`Eval "${name}" must be an object`);
    }
    if (!("eval" in evalDef) || typeof (evalDef as { eval: unknown }).eval !== "function") {
      throw new VibecheckInputError(`Eval "${name}" must have an \`eval\` function`);
    }
    // Surface diffSchema/inputs errors at load time so every command (not just
    // `vibecheck validate`) refuses to run with a broken config.
    const issues = validateEvalDef(evalDef as Parameters<typeof validateEvalDef>[0])
      .filter((i) => i.level === "error");
    if (issues.length > 0) {
      throw new VibecheckInputError(
        `Eval "${name}" invalid:\n  ${issues.map((i) => i.message).join("\n  ")}`,
      );
    }
  }
}

export function resolveEval(config: EvalConfig, evalName: string | undefined): { name: string; evalDef: ReturnType<typeof getEval> } {
  const name = evalName ?? "default";
  const evalDef = getEval(config, name);
  return { name, evalDef };
}

function getEval(config: EvalConfig, name: string) {
  const evalDef = config.evals[name];
  if (!evalDef) {
    const available = Object.keys(config.evals).join(", ");
    throw new VibecheckInputError(`Eval "${name}" not found. Available: ${available}`);
  }
  return evalDef;
}
