// Zod schema for the structured output produced by the extraction pipeline.
// This defines the shape that extractRestaurant() returns and that vibecheck diffs against golden.
// Used by vibecheck.config.ts via fromZod() to generate a DiffSchema for structured diffs.

import { z } from "zod";

export const ExtractedRestaurantSchema = z.object({
  name: z.string(),
  cuisineType: z.string(),
  priceRange: z.enum(["budget", "moderate", "upscale", "fine-dining"]),
  overallRating: z.number(),
  dishes: z.array(
    z.object({
      name: z.string(),
      sentiment: z.enum(["positive", "neutral", "negative"]),
    })
  ),
  attributes: z.array(z.string()),
  pricePoints: z.array(
    z.object({
      item: z.string(),
      price: z.string(),
    })
  ),
  sentiment: z.object({
    positive: z.number(),
    negative: z.number(),
    neutral: z.number(),
  }),
  highlights: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ExtractedRestaurant = z.infer<typeof ExtractedRestaurantSchema>;
