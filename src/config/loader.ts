import { join } from "path";
import { existsSync } from "fs";
import type { EvalConfig } from "../types";

const CONFIG_FILENAMES = ["ee.config.ts", "ee.config.js"];

export async function loadConfig(cwd: string = process.cwd()): Promise<EvalConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const filepath = join(cwd, filename);
    if (existsSync(filepath)) {
      const mod = await import(filepath);
      const config = mod.default ?? mod;
      validateConfig(config);
      return config as EvalConfig;
    }
  }

  console.error("No ee.config.ts found in current directory.");
  console.error("Run `ee init` to create one.");
  process.exit(1);
}

function validateConfig(config: unknown): asserts config is EvalConfig {
  if (config === null || config === undefined || typeof config !== "object") {
    throw new Error("Config must export an object");
  }

  if (!("evals" in config) || config.evals === null || typeof config.evals !== "object") {
    throw new Error("Config must have an `evals` object");
  }

  const evals = config.evals;
  for (const [name, evalDef] of Object.entries(evals)) {
    if (evalDef === null || typeof evalDef !== "object") {
      throw new Error(`Eval "${name}" must be an object`);
    }
    if (!("eval" in evalDef) || typeof evalDef.eval !== "function") {
      throw new Error(`Eval "${name}" must have an \`eval\` function`);
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
    console.error(`Eval "${name}" not found. Available: ${available}`);
    process.exit(1);
  }
  return evalDef;
}
