import { describe, test, expect } from "bun:test";
import {
  VibecheckInputError,
  validateIdentifier,
  validateTimestamp,
  validateLimit,
} from "./validation";

describe("validateIdentifier", () => {
  test("accepts alphanumerics, dot, underscore, hyphen", () => {
    expect(validateIdentifier("user-123", "datasetId")).toBe("user-123");
    expect(validateIdentifier("a.b_c-D9", "datasetId")).toBe("a.b_c-D9");
  });

  test("rejects empty / missing", () => {
    expect(() => validateIdentifier("", "datasetId")).toThrow(VibecheckInputError);
    expect(() => validateIdentifier(undefined, "datasetId")).toThrow(VibecheckInputError);
    expect(() => validateIdentifier(null, "datasetId")).toThrow(VibecheckInputError);
  });

  test("rejects path traversal segments", () => {
    expect(() => validateIdentifier("..", "datasetId")).toThrow(VibecheckInputError);
    expect(() => validateIdentifier("../etc", "datasetId")).toThrow(VibecheckInputError);
    expect(() => validateIdentifier("a/b", "worker")).toThrow(/match/);
    expect(() => validateIdentifier("a\\b", "worker")).toThrow(/match/);
  });

  test("rejects leading dot (would create hidden dirs)", () => {
    expect(() => validateIdentifier(".env", "datasetId")).toThrow(/must not start with/);
    expect(() => validateIdentifier(".hidden", "worker")).toThrow(/must not start with/);
  });

  test("rejects whitespace and shell metacharacters", () => {
    expect(() => validateIdentifier("a b", "datasetId")).toThrow();
    expect(() => validateIdentifier("a;b", "datasetId")).toThrow();
    expect(() => validateIdentifier("a$b", "datasetId")).toThrow();
  });

  test("rejects values longer than 128 chars", () => {
    expect(() => validateIdentifier("a".repeat(129), "datasetId")).toThrow(/exceeds/);
    expect(validateIdentifier("a".repeat(128), "datasetId")).toHaveLength(128);
  });

  test("error message includes the label", () => {
    try {
      validateIdentifier("../oops", "datasetId");
    } catch (e) {
      expect((e as Error).message).toContain("datasetId");
    }
  });
});

describe("validateTimestamp", () => {
  test("accepts canonical ISO 8601 with millis + Z", () => {
    const ts = new Date().toISOString();
    expect(validateTimestamp(ts, "ts")).toBe(ts);
    expect(validateTimestamp("2025-01-15T10:30:00.000Z", "ts")).toBe("2025-01-15T10:30:00.000Z");
  });

  test("rejects non-string / empty / non-ISO", () => {
    expect(() => validateTimestamp(undefined, "ts")).toThrow(VibecheckInputError);
    expect(() => validateTimestamp("", "ts")).toThrow();
    expect(() => validateTimestamp("2025-01-15", "ts")).toThrow();
    expect(() => validateTimestamp("not-a-date", "ts")).toThrow();
  });

  test("rejects path-traversal payloads", () => {
    expect(() => validateTimestamp("../../etc/passwd", "ts")).toThrow();
  });

  test("rejects timestamps without millisecond precision", () => {
    expect(() => validateTimestamp("2025-01-15T10:30:00Z", "ts")).toThrow();
  });
});

describe("validateLimit", () => {
  test("returns fallback when undefined", () => {
    expect(validateLimit(undefined)).toBe(20);
    expect(validateLimit(undefined, 5)).toBe(5);
  });

  test("accepts positive integers", () => {
    expect(validateLimit("1")).toBe(1);
    expect(validateLimit("100")).toBe(100);
  });

  test("rejects non-numeric, zero, negative, fractional, oversized", () => {
    expect(() => validateLimit("abc")).toThrow(/positive integer/);
    expect(() => validateLimit("0")).toThrow();
    expect(() => validateLimit("-5")).toThrow();
    expect(() => validateLimit("3.5")).toThrow();
    expect(() => validateLimit("10001")).toThrow();
  });
});
