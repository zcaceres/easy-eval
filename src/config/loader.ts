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

  if (!("workers" in config) || config.workers === null || typeof config.workers !== "object") {
    throw new Error("Config must have a `workers` object");
  }

  const workers = config.workers;
  for (const [name, worker] of Object.entries(workers)) {
    if (worker === null || typeof worker !== "object") {
      throw new Error(`Worker "${name}" must be an object`);
    }
    if (!("run" in worker) || typeof worker.run !== "function") {
      throw new Error(`Worker "${name}" must have a \`run\` function`);
    }
  }
}

export function resolveWorker(config: EvalConfig, workerName: string | undefined): { name: string; worker: ReturnType<typeof getWorker> } {
  const name = workerName ?? "default";
  const worker = getWorker(config, name);
  return { name, worker };
}

function getWorker(config: EvalConfig, name: string) {
  const worker = config.workers[name];
  if (!worker) {
    const available = Object.keys(config.workers).join(", ");
    console.error(`Worker "${name}" not found. Available: ${available}`);
    process.exit(1);
  }
  return worker;
}
