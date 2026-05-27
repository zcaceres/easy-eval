import { defineConfig, fromZod } from "../src/index";
import { REVIEWS } from "./reviews";
import { extractRestaurant } from "./extractor";
import { ExtractedRestaurantSchema } from "./schema";

export default defineConfig({
  workers: {
    default: {
      inputs: async (datasetId) => {
        const input = REVIEWS[datasetId];
        if (!input) {
          throw new Error(`Unknown dataset: ${datasetId}. Available: ${Object.keys(REVIEWS).join(", ")}`);
        }
        return input;
      },

      run: async (ctx) => {
        const input = ctx.inputs as { restaurantId: string; reviews: string[] };
        return extractRestaurant(input.restaurantId, input.reviews);
      },

      schema: fromZod(ExtractedRestaurantSchema, {
        dishes: { display: (item: any) => `${item.name} (${item.sentiment})` },
        pricePoints: { key: "item", display: (item: any) => `${item.item}: ${item.price}` },
      }),
    },
  },

  storage: { dir: ".ee" },
});
