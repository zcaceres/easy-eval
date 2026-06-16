import { describe, test, expect } from "bun:test";
import { autoDiff } from "./auto";

describe("autoDiff — keyed object arrays", () => {
  // Regression: when only some array items carry the guessed key field, the
  // ragged items used to collide on String(undefined) and all but the last
  // were silently dropped from the diff.
  test("does not drop ragged items lacking the guessed key field", () => {
    const golden = { items: [{ id: "a", v: 1 }, { label: "x", v: 2 }, { label: "y", v: 3 }] };
    const eval_ = { items: [{ id: "a", v: 1 }, { label: "x", v: 999 }, { label: "y", v: 888 }] };

    const result = autoDiff(golden, eval_);
    const section = result.sections.find((s) => s.path.includes("items"));
    expect(section).toBeDefined();

    const changed = section!.rows.filter((r) => r.status === "changed").length;
    expect(changed).toBe(2);
  });

  test("still uses keyed diff when the key field is present on every item", () => {
    const golden = { items: [{ id: "a", v: 1 }, { id: "b", v: 2 }] };
    const eval_ = { items: [{ id: "a", v: 1 }, { id: "b", v: 99 }] };

    const result = autoDiff(golden, eval_);
    const section = result.sections.find((s) => s.path.includes("items"));
    expect(section).toBeDefined();

    const keys = section!.rows.map((r) => r.key).sort();
    expect(keys).toEqual(["a", "b"]);
    expect(section!.rows.find((r) => r.key === "b")?.status).toBe("changed");
  });
});
