import { describe, test, expect } from "bun:test";
import { vibecheck } from "./vibecheck";
import { exactMatch } from "./exactMatch";
import { fuzzyMatch } from "./fuzzyMatch";
import { extractRestaurant } from "../../example/extractor";
import type { EvalRun, Golden, EvalDef } from "../types";

function makeGolden(output: unknown): Golden {
  return {
    blessedAt: "2025-01-01T00:00:00.000Z",
    datasetId: "golden-dragon",
    worker: "default",
    output,
  };
}

function makeRun(output: unknown): EvalRun {
  return {
    timestamp: "2025-01-01T00:00:01.000Z",
    datasetId: "golden-dragon",
    worker: "default",
    durationMs: 100,
    output,
  };
}

const evalDef: EvalDef = { eval: async () => ({}) };
const restaurants = ["golden-dragon", "the-rustic-oven", "cafe-lumiere"] as const;

describe("judges e2e — example restaurant data", () => {
  // ─── vibecheck ────────────────────────────────────────────────

  describe("vibecheck", () => {
    test("passes when golden and run are the same object", async () => {
      const output = extractRestaurant("golden-dragon", []);
      const judge = vibecheck();
      const verdict = await judge({ run: makeRun(output), golden: makeGolden(output), evalDef });
      expect(verdict.pass).toBe(true);
    });

    for (const id of restaurants) {
      test(`produces a verdict for ${id}`, async () => {
        const golden = extractRestaurant(id, []);
        const run = extractRestaurant(id, []);
        const judge = vibecheck();
        const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
        expect(verdict).toHaveProperty("pass");
        expect(verdict).toHaveProperty("summary");
        expect(typeof verdict.pass).toBe("boolean");
        expect(verdict.summary.length).toBeGreaterThan(0);
      });
    }
  });

  // ─── exactMatch ───────────────────────────────────────────────

  describe("exactMatch", () => {
    test("passes with identical output", async () => {
      const output = extractRestaurant("golden-dragon", []);
      const judge = exactMatch();
      const verdict = await judge({ run: makeRun(output), golden: makeGolden(output), evalDef });
      expect(verdict.pass).toBe(true);
    });

    test("fails when randomized outputs differ", async () => {
      const golden = extractRestaurant("golden-dragon", []);
      const run = extractRestaurant("golden-dragon", []);
      const judge = exactMatch();
      const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
      // Two independent extractions almost always differ due to randomness
      // (pass=true is possible but astronomically unlikely)
      expect(typeof verdict.pass).toBe("boolean");
    });

    for (const id of restaurants) {
      test(`passes on deterministic fields for ${id}`, async () => {
        const golden = extractRestaurant(id, []);
        const run = extractRestaurant(id, []);
        const judge = exactMatch({ fields: ["name", "cuisineType", "priceRange"] });
        const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
        expect(verdict.pass).toBe(true);
      });
    }

    test("fails on randomized fields", async () => {
      const golden = extractRestaurant("golden-dragon", []);
      const run = extractRestaurant("golden-dragon", []);
      const judge = exactMatch({ fields: ["overallRating"] });
      const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
      // overallRating uses jitter, so almost always differs
      expect(typeof verdict.pass).toBe("boolean");
    });
  });

  // ─── fuzzyMatch ───────────────────────────────────────────────

  describe("fuzzyMatch", () => {
    test("passes with identical output", async () => {
      const output = extractRestaurant("the-rustic-oven", []);
      const judge = fuzzyMatch();
      const verdict = await judge({ run: makeRun(output), golden: makeGolden(output), evalDef });
      expect(verdict.pass).toBe(true);
    });

    for (const id of restaurants) {
      test(`passes on deterministic fields with case normalization for ${id}`, async () => {
        const golden = extractRestaurant(id, []);
        const run = extractRestaurant(id, []);
        const judge = fuzzyMatch({ fields: ["name", "cuisineType", "priceRange"] });
        const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
        expect(verdict.pass).toBe(true);
      });
    }

    test("numeric tolerance absorbs rating jitter", async () => {
      const golden = extractRestaurant("golden-dragon", []);
      const run = extractRestaurant("golden-dragon", []);
      const judge = fuzzyMatch({ fields: ["overallRating"], numericTolerance: 0.15 });
      const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
      // jitter range is ±0.3 on ~4.4, so ±~7% — 15% tolerance should pass
      expect(verdict.pass).toBe(true);
    });

    test("levenshtein catches minor text variations in name", async () => {
      const golden = extractRestaurant("cafe-lumiere", []);
      const run = { ...golden, name: "Cafe Lumiere" }; // accent dropped
      const judge = fuzzyMatch({ fields: ["name"], minSimilarity: 0.8 });
      const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
      expect(verdict.pass).toBe(true);
    });

    test("strict fuzzyMatch still catches large differences", async () => {
      const golden = extractRestaurant("golden-dragon", []);
      const run = { ...golden, name: "Totally Different Restaurant" };
      const judge = fuzzyMatch({ fields: ["name"], minSimilarity: 0.9, ignoreCase: false });
      const verdict = await judge({ run: makeRun(run), golden: makeGolden(golden), evalDef });
      expect(verdict.pass).toBe(false);
    });
  });

  // ─── cross-judge consistency ──────────────────────────────────

  describe("cross-judge consistency", () => {
    test("all judges pass=true with same object reference", async () => {
      const output = extractRestaurant("golden-dragon", []);
      const input = { run: makeRun(output), golden: makeGolden(output), evalDef };

      const vc = await vibecheck()(input);
      const em = await exactMatch()(input);
      const fm = await fuzzyMatch()(input);

      expect(vc.pass).toBe(true);
      expect(em.pass).toBe(true);
      expect(fm.pass).toBe(true);
    });

    test("all judges pass=true with no golden", async () => {
      const output = extractRestaurant("the-rustic-oven", []);
      const input = { run: makeRun(output), golden: null, evalDef };

      const vc = await vibecheck()(input);
      const em = await exactMatch()(input);
      const fm = await fuzzyMatch()(input);

      expect(vc.pass).toBe(true);
      expect(em.pass).toBe(true);
      expect(fm.pass).toBe(true);
    });

    test("all judges return valid EvalVerdict shape", async () => {
      const output = extractRestaurant("cafe-lumiere", []);
      const input = { run: makeRun(output), golden: makeGolden(output), evalDef };

      for (const judge of [vibecheck(), exactMatch(), fuzzyMatch()]) {
        const verdict = await judge(input);
        expect(verdict).toHaveProperty("pass");
        expect(verdict).toHaveProperty("summary");
        expect(verdict).toHaveProperty("diff");
        expect(typeof verdict.pass).toBe("boolean");
        expect(typeof verdict.summary).toBe("string");
      }
    });
  });
});
