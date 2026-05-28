import { defineConfig, vibecheck, fromZod } from "../src/index";
import { REVIEWS } from "./reviews";
import { extractRestaurant } from "./extractor";
import { ExtractedRestaurantSchema } from "./schema";

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
      inputs: async (datasetId) => {
        const input = REVIEWS[datasetId];
        if (!input) {
          throw new Error(
            `Unknown dataset: ${datasetId}. Available: ${Object.keys(REVIEWS).join(", ")}`,
          );
        }
        return input;
      },

      eval: async (ctx) => {
        const input = ctx.inputs as { restaurantId: string; reviews: string[] };
        const model = ctx.vars.model ?? "gpt-4o";
        return extractRestaurant(input.restaurantId, input.reviews, model);
      },

      judge: vibecheck({ schema }),
      diffSchema: schema,
    },
  },

  storage: { dir: ".ee" },
});
