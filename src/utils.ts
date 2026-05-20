export function deepEqual(a: unknown, b: unknown): boolean {
  return canonicalize(a) === canonicalize(b);
}

function canonicalize(val: unknown): string {
  if (val === null || val === undefined || typeof val !== "object") {
    return JSON.stringify(val) ?? "null";
  }
  if (Array.isArray(val)) {
    return "[" + val.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize((val as Record<string, unknown>)[k])).join(",") + "}";
}
