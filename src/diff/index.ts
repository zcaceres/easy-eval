import type { DiffResult, DiffSchema } from "../types";
import { autoDiff } from "./auto";
import { schemaDiff } from "./engine";

export function diff(golden: unknown, eval_: unknown, schema?: DiffSchema): DiffResult {
  if (schema) {
    return schemaDiff(golden, eval_, schema);
  }
  return autoDiff(golden, eval_);
}
