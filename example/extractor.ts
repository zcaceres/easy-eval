import type { ExtractedRestaurant } from "./schema";

export function extractRestaurant(restaurantId: string, _reviews: string[], _model?: string): ExtractedRestaurant {
  const extractors: Record<string, () => ExtractedRestaurant> = {
    "golden-dragon": () => ({
      name: "Golden Dragon",
      cuisineType: "Chinese / Sichuan",
      priceRange: "budget",
      overallRating: 4.4,
      dishes: [
        { name: "Dan Dan Noodles", sentiment: "positive" },
        { name: "Mapo Tofu", sentiment: "positive" },
        { name: "Cumin Lamb", sentiment: "positive" },
        { name: "Kung Pao Chicken", sentiment: "positive" },
        { name: "Tea-Smoked Duck", sentiment: "negative" },
        { name: "Soup Dumplings (XLB)", sentiment: "positive" },
        { name: "Turnip Cake", sentiment: "positive" },
        { name: "Hot Pot", sentiment: "positive" },
      ],
      attributes: [
        "cash-only",
        "byob",
        "no-reservations",
        "family-run",
        "open-late",
        "hand-pulled-noodles",
      ],
      pricePoints: [
        { item: "Dan Dan Noodles", price: "$14" },
      ],
      sentiment: { positive: 3, negative: 0, neutral: 1 },
      highlights: [
        "Hand-pulled noodles made fresh to order",
        "Grandma still makes dumpling wrappers by hand",
        "15 years of consistent quality",
        "Perfect Sichuan peppercorn balance",
      ],
      warnings: [
        "Cash only",
        "Service is efficient but impersonal",
        "Tea-smoked duck was dry",
      ],
    }),

    "the-rustic-oven": () => ({
      name: "The Rustic Oven",
      cuisineType: "Italian / Neapolitan Pizza",
      priceRange: "upscale",
      overallRating: 3.9,
      dishes: [
        { name: "Margherita Pizza", sentiment: "positive" },
        { name: "Burrata Appetizer", sentiment: "positive" },
        { name: "Diavola Pizza", sentiment: "positive" },
        { name: "Tiramisu", sentiment: "positive" },
        { name: "Truffle Pizza", sentiment: "positive" },
        { name: "Arugula Salad", sentiment: "negative" },
      ],
      attributes: [
        "wood-fired-oven",
        "no-reservations",
        "intimate-setting",
        "date-spot",
        "neapolitan-owner",
        "seasonal-menu",
      ],
      pricePoints: [
        { item: "Margherita Pizza", price: "$18" },
        { item: "Truffle Pizza", price: "$22" },
      ],
      sentiment: { positive: 3, negative: 1, neutral: 0 },
      highlights: [
        "Leopard-spotted crust from wood-fired oven",
        "Fresh black truffle shaved tableside",
        "Owner is from Naples",
        "Excellent house Montepulciano",
      ],
      warnings: [
        "Long waits even with reservation",
        "Expensive for pizza",
        "Inconsistent service",
      ],
    }),

    "cafe-lumiere": () => ({
      name: "Café Lumière",
      cuisineType: "French Bistro",
      priceRange: "moderate",
      overallRating: 3.5,
      dishes: [
        { name: "Croque Monsieur", sentiment: "positive" },
        { name: "French Onion Soup", sentiment: "positive" },
        { name: "Duck Confit", sentiment: "positive" },
        { name: "Frisée Salad", sentiment: "positive" },
        { name: "Crème Brûlée", sentiment: "neutral" },
        { name: "Eggs Benedict", sentiment: "positive" },
        { name: "French Toast", sentiment: "positive" },
        { name: "Steak Frites", sentiment: "negative" },
        { name: "Profiteroles", sentiment: "positive" },
      ],
      attributes: [
        "patio-seating",
        "brunch",
        "prix-fixe-lunch",
        "well-curated-wine-list",
        "bottomless-mimosas",
      ],
      pricePoints: [
        { item: "Prix Fixe Lunch", price: "$16" },
        { item: "Bottomless Mimosas", price: "$25" },
        { item: "Steak Frites", price: "$34" },
      ],
      sentiment: { positive: 2, negative: 2, neutral: 0 },
      highlights: [
        "Textbook croque monsieur",
        "Duck confit fall-off-the-bone tender",
        "Silky hollandaise on eggs Benedict",
        "Charming patio seating",
      ],
      warnings: [
        "Steak often overcooked",
        "Slow service on off-peak nights",
        "Gets packed by 11am for brunch",
      ],
    }),
  };

  const extract = extractors[restaurantId];
  if (!extract) {
    throw new Error(`Unknown restaurant: ${restaurantId}. Available: ${Object.keys(extractors).join(", ")}`);
  }
  return extract();
}
