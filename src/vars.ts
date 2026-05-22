export function parseVar(value: string): { key: string; value: string } {
  const eq = value.indexOf("=");
  if (eq === -1) {
    throw new Error(`Invalid --var format: "${value}". Expected key=value.`);
  }
  const key = value.slice(0, eq);
  if (key === "") {
    throw new Error(`Invalid --var format: "${value}". Key cannot be empty.`);
  }
  return { key, value: value.slice(eq + 1) };
}

export function collectVars(value: string, previous: Record<string, string>): Record<string, string> {
  const parsed = parseVar(value);
  previous[parsed.key] = parsed.value;
  return previous;
}
