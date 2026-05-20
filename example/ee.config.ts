import { defineConfig } from "../src/index";
import { REVIEWS } from "./reviews";
import { extractRestaurant } from "./extractor";

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

      schema: {
        sections: [
          { path: "name", label: "Name", kind: "scalar" },
          { path: "cuisineType", label: "Cuisine", kind: "scalar" },
          { path: "priceRange", label: "Price Range", kind: "scalar" },
          { path: "overallRating", label: "Rating", kind: "scalar" },
          {
            path: "dishes",
            label: "Dishes",
            kind: "keyed-array",
            key: "name",
            display: (item: any) => `${item.name} (${item.sentiment})`,
          },
          {
            path: "attributes",
            label: "Attributes",
            kind: "set",
          },
          {
            path: "pricePoints",
            label: "Price Points",
            kind: "keyed-array",
            key: "item",
            display: (item: any) => `${item.item}: ${item.price}`,
          },
          {
            path: "highlights",
            label: "Highlights",
            kind: "set",
          },
          {
            path: "warnings",
            label: "Warnings",
            kind: "set",
          },
        ],
      },
    },
  },

  storage: { dir: ".ee" },
});
