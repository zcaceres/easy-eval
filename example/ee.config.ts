// Example: restaurant review extraction pipeline evaluated with easy-eval.
//
// This example simulates an LLM extraction pipeline that reads restaurant
// reviews and produces structured data (dishes, ratings, highlights, etc.).
// The extractor intentionally introduces random variation to mimic LLM
// non-determinism, making it useful for exercising ee's diff/merge features.
//
// Try it:
//   ee eval golden-dragon
//   ee eval the-rustic-oven
//   ee eval cafe-lumiere

import { defineConfig, vibecheck, fromZod } from "../src/index";
import { REVIEWS } from "./reviews";
import { extractRestaurant } from "./extractor";
import { ExtractedRestaurantSchema } from "./schema";

// Convert the Zod schema into an ee DiffSchema for structured diffs.
// Overrides control how items are displayed in diff output.
const schema = fromZod(ExtractedRestaurantSchema, {
  dishes: { display: (item: any) => `${item.name} (${item.sentiment})` },
  pricePoints: {
    key: "item",
    display: (item: any) => `${item.item}: ${item.price}`,
  },
});

export default defineConfig({
  evals: {
    default: {
      // Load review data for a given datasetId (e.g. "golden-dragon").
      // See reviews.ts for the available datasets and their raw review text.
      inputs: async (datasetId) => {
        const input = REVIEWS[datasetId];
        if (!input) {
          throw new Error(
            `Unknown dataset: ${datasetId}. Available: ${Object.keys(REVIEWS).join(", ")}`,
          );
        }
        return input;
      },

      // The eval function — runs the "extraction pipeline" and returns structured output.
      // In a real project this would call an LLM; here it calls a deterministic-ish simulator.
      eval: async (ctx) => {
        const input = ctx.inputs as { restaurantId: string; reviews: string[] };
        const model = ctx.vars.model ?? "gpt-4o";
        return extractRestaurant(input.restaurantId, input.reviews, model);
      },

      // vibecheck() is the built-in judge — diffs eval output against golden.
      // Passing the schema gives structured section-by-section diffs instead of raw JSON diff.
      judge: vibecheck({ schema }),

      // diffSchema controls how ee report / ee merge render diffs (framework-level display).
      // Often the same schema object as the judge, but conceptually independent.
      diffSchema: schema,
    },
  },

  storage: { dir: ".ee" },
});
