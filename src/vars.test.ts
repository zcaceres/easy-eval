import { describe, expect, test } from "bun:test";
import { parseVar, collectVars } from "./vars";

describe("parseVar", () => {
  test("simple key=value", () => {
    expect(parseVar("model=gpt-4o")).toEqual({ key: "model", value: "gpt-4o" });
  });

  test("value with spaces", () => {
    expect(parseVar("prompt=be concise and direct")).toEqual({
      key: "prompt",
      value: "be concise and direct",
    });
  });

  test("value containing equals sign", () => {
    expect(parseVar("formula=a=b+c")).toEqual({ key: "formula", value: "a=b+c" });
  });

  test("empty value", () => {
    expect(parseVar("key=")).toEqual({ key: "key", value: "" });
  });

  test("value with special characters", () => {
    expect(parseVar("prompt=Extract all items (including $prices)")).toEqual({
      key: "prompt",
      value: "Extract all items (including $prices)",
    });
  });

  test("key with hyphens", () => {
    expect(parseVar("model-name=claude-sonnet-4-20250514")).toEqual({
      key: "model-name",
      value: "claude-sonnet-4-20250514",
    });
  });

  test("key with underscores", () => {
    expect(parseVar("max_tokens=1024")).toEqual({ key: "max_tokens", value: "1024" });
  });

  test("value with newlines", () => {
    expect(parseVar("prompt=line1\nline2")).toEqual({
      key: "prompt",
      value: "line1\nline2",
    });
  });

  test("value with quotes (passed through shell)", () => {
    expect(parseVar('style="formal"')).toEqual({ key: "style", value: '"formal"' });
  });

  test("throws on missing equals", () => {
    expect(() => parseVar("noequals")).toThrow('Invalid --var format: "noequals". Expected key=value.');
  });

  test("throws on empty key", () => {
    expect(() => parseVar("=value")).toThrow('Invalid --var format: "=value". Key cannot be empty.');
  });

  test("throws on bare equals", () => {
    expect(() => parseVar("=")).toThrow('Invalid --var format: "=". Key cannot be empty.');
  });
});

describe("collectVars", () => {
  test("accumulates multiple vars", () => {
    let vars: Record<string, string> = {};
    vars = collectVars("model=gpt-4o", vars);
    vars = collectVars("prompt=be concise", vars);
    vars = collectVars("temperature=0.7", vars);
    expect(vars).toEqual({
      model: "gpt-4o",
      prompt: "be concise",
      temperature: "0.7",
    });
  });

  test("later value overwrites earlier for same key", () => {
    let vars: Record<string, string> = {};
    vars = collectVars("model=gpt-4o", vars);
    vars = collectVars("model=claude-sonnet-4-20250514", vars);
    expect(vars).toEqual({ model: "claude-sonnet-4-20250514" });
  });

  test("starts from empty object", () => {
    const vars = collectVars("key=value", {});
    expect(vars).toEqual({ key: "value" });
  });
});
