import type { DiffSchema, SectionConfig } from "../types";

type ZodTypeDef = { typeName: string };
type ZodType = { _def: ZodTypeDef };
type ZodObject = ZodType & { shape: Record<string, ZodType> };

interface SectionOverride {
  label?: string;
  kind?: SectionConfig["kind"];
  key?: string | ((item: unknown) => string);
  eq?: (golden: unknown, eval_: unknown) => boolean;
  display?: (item: unknown) => string;
  identity?: (item: unknown) => string;
}

export type ZodOverrides<TShape extends Record<string, unknown> = Record<string, unknown>> = {
  [K in keyof TShape]?: SectionOverride | false;
};

const KEY_CANDIDATES = ["id", "key", "name", "slug", "code"];

function humanize(path: string): string {
  return path
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function unwrapZodType(def: ZodTypeDef): ZodTypeDef {
  const d = def as any;
  if (
    d.typeName === "ZodOptional" ||
    d.typeName === "ZodNullable" ||
    d.typeName === "ZodDefault"
  ) {
    return unwrapZodType(d.innerType._def);
  }
  return d;
}

function isScalarDef(def: ZodTypeDef): boolean {
  const name = def.typeName;
  return (
    name === "ZodString" ||
    name === "ZodNumber" ||
    name === "ZodBoolean" ||
    name === "ZodEnum" ||
    name === "ZodLiteral" ||
    name === "ZodDate"
  );
}

function guessKey(objectDef: any): string | undefined {
  const shape: Record<string, ZodType> | undefined = objectDef.shape?.() as Record<string, ZodType> | undefined;
  if (!shape) return undefined;
  for (const candidate of KEY_CANDIDATES) {
    const field = shape[candidate];
    if (field) {
      const inner = unwrapZodType(field._def);
      if (isScalarDef(inner)) return candidate;
    }
  }
  return undefined;
}

function inferSection(path: string, zodType: ZodType, overrides: ZodOverrides<Record<string, unknown>>): SectionConfig | null {
  const override = overrides[path];
  if (override === false) return null;

  const def = unwrapZodType(zodType._def);
  const label = override?.label ?? humanize(path);

  if (override?.kind) {
    return buildSection(path, label, override.kind, def, override);
  }

  if (isScalarDef(def)) {
    return { path, label, kind: "scalar", ...pick(override, "eq", "display") } as SectionConfig;
  }

  if (def.typeName === "ZodArray") {
    const elementDef = unwrapZodType((def as any).type._def);

    if (isScalarDef(elementDef)) {
      return { path, label, kind: "set", ...pick(override, "identity", "display") } as SectionConfig;
    }

    if (elementDef.typeName === "ZodObject") {
      const key = override?.key ?? guessKey(elementDef);
      if (key) {
        return { path, label, kind: "keyed-array", key, ...pick(override, "eq", "display") } as SectionConfig;
      }
      return { path, label, kind: "set", ...pick(override, "identity", "display") } as SectionConfig;
    }

    return { path, label, kind: "set", ...pick(override, "identity", "display") } as SectionConfig;
  }

  if (def.typeName === "ZodObject") {
    return { path, label, kind: "scalar", ...pick(override, "eq", "display") } as SectionConfig;
  }

  return { path, label, kind: "scalar", ...pick(override, "eq", "display") } as SectionConfig;
}

function buildSection(
  path: string,
  label: string,
  kind: SectionConfig["kind"],
  _def: ZodTypeDef,
  override: SectionOverride,
): SectionConfig {
  switch (kind) {
    case "scalar":
      return { path, label, kind, ...pick(override, "eq", "display") };
    case "keyed-array":
      return { path, label, kind, key: override.key ?? "id", ...pick(override, "eq", "display") };
    case "set":
      return { path, label, kind, ...pick(override, "identity", "display") };
    case "ordered-array":
      return { path, label, kind, ...pick(override, "display") };
  }
}

function pick(
  obj: SectionOverride | undefined,
  ...keys: string[]
): Record<string, unknown> {
  if (!obj) return {};
  const result: Record<string, unknown> = {};
  for (const k of keys) {
    const val = (obj as any)[k];
    if (val !== undefined) result[k] = val;
  }
  return result;
}

export function fromZod<T extends ZodObject>(schema: T, overrides: ZodOverrides<T["shape"]> = {}): DiffSchema {
  if (!schema || !schema.shape) {
    throw new Error("fromZod expects a Zod object schema (z.object({...}))");
  }

  const sections: SectionConfig[] = [];
  for (const [path, zodType] of Object.entries(schema.shape)) {
    const section = inferSection(path, zodType, overrides as ZodOverrides);
    if (section) sections.push(section);
  }
  return { sections };
}
