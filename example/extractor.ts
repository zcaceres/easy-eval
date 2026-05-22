import type { ExtractedRestaurant } from "./schema";

// ─── Randomness helpers for test variability ─────────────────────
// These simulate LLM non-determinism so each eval run produces
// slightly different outputs — useful for stress-testing diffs,
// the changelog, and other features that depend on run-to-run variation.

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function jitter(n: number, range: number = 0.3): number {
  return Math.round((n + (Math.random() * 2 - 1) * range) * 10) / 10;
}

function maybeDrop<T>(arr: T[], chance: number = 0.15): T[] {
  return arr.filter(() => Math.random() > chance);
}

function maybeAdd<T>(arr: T[], extras: T[], chance: number = 0.2): T[] {
  const result = [...arr];
  for (const item of extras) {
    if (Math.random() < chance) result.push(item);
  }
  return result;
}

function flipSentiment(s: "positive" | "neutral" | "negative", chance: number = 0.1): "positive" | "neutral" | "negative" {
  if (Math.random() > chance) return s;
  const options = ["positive", "neutral", "negative"] as const;
  return pick(options.filter((o) => o !== s));
}

function varyText(s: string, chance: number = 0.2): string {
  if (Math.random() > chance) return s;
  const tweaks = [
    (t: string) => t.replace(/perfect/i, "excellent"),
    (t: string) => t.replace(/great/i, "solid"),
    (t: string) => t.replace(/fresh/i, "house-made"),
    (t: string) => t + " — a standout",
    (t: string) => t.replace(/consistent/i, "reliable"),
  ];
  return pick(tweaks)(s);
}

export function extractRestaurant(restaurantId: string, _reviews: string[], _model?: string): ExtractedRestaurant {
  const extractors: Record<string, () => ExtractedRestaurant> = {
    "golden-dragon": () => ({
      name: "Golden Dragon",
      cuisineType: "Chinese / Sichuan",
      priceRange: "budget" as const,
      overallRating: jitter(4.4),
      dishes: maybeAdd(
        maybeDrop([
          { name: "Dan Dan Noodles", sentiment: flipSentiment("positive") },
          { name: "Mapo Tofu", sentiment: flipSentiment("positive") },
          { name: "Cumin Lamb", sentiment: flipSentiment("positive") },
          { name: "Kung Pao Chicken", sentiment: flipSentiment("positive") },
          { name: "Tea-Smoked Duck", sentiment: flipSentiment("negative") },
          { name: "Soup Dumplings (XLB)", sentiment: flipSentiment("positive") },
          { name: "Turnip Cake", sentiment: flipSentiment("positive") },
          { name: "Hot Pot", sentiment: flipSentiment("positive") },
        ]),
        [
          { name: "Scallion Pancakes", sentiment: "positive" as const },
          { name: "Salt & Pepper Squid", sentiment: "positive" as const },
        ],
      ),
      attributes: maybeAdd(
        maybeDrop([
          "cash-only",
          "byob",
          "no-reservations",
          "family-run",
          "open-late",
          "hand-pulled-noodles",
        ]),
        ["large-portions", "dim-sum-weekends"],
      ),
      pricePoints: maybeAdd(
        [{ item: "Dan Dan Noodles", price: "$14" }],
        [{ item: "Cumin Lamb", price: "$18" }],
      ),
      sentiment: { positive: 2 + Math.floor(Math.random() * 2), negative: Math.floor(Math.random() * 2), neutral: Math.floor(Math.random() * 2) },
      highlights: maybeDrop([
        varyText("Hand-pulled noodles made fresh to order"),
        varyText("Grandma still makes dumpling wrappers by hand"),
        varyText("15 years of consistent quality"),
        varyText("Perfect Sichuan peppercorn balance"),
      ]),
      warnings: maybeDrop([
        "Cash only",
        "Service is efficient but impersonal",
        "Tea-smoked duck was dry",
      ]),
    }),

    "the-rustic-oven": () => ({
      name: "The Rustic Oven",
      cuisineType: "Italian / Neapolitan Pizza",
      priceRange: "upscale" as const,
      overallRating: jitter(3.9),
      dishes: maybeAdd(
        maybeDrop([
          { name: "Margherita Pizza", sentiment: flipSentiment("positive") },
          { name: "Burrata Appetizer", sentiment: flipSentiment("positive") },
          { name: "Diavola Pizza", sentiment: flipSentiment("positive") },
          { name: "Tiramisu", sentiment: flipSentiment("positive") },
          { name: "Truffle Pizza", sentiment: flipSentiment("positive") },
          { name: "Arugula Salad", sentiment: flipSentiment("negative") },
        ]),
        [
          { name: "Cacio e Pepe", sentiment: "positive" as const },
          { name: "Panna Cotta", sentiment: "neutral" as const },
        ],
      ),
      attributes: maybeAdd(
        maybeDrop([
          "wood-fired-oven",
          "no-reservations",
          "intimate-setting",
          "date-spot",
          "neapolitan-owner",
          "seasonal-menu",
        ]),
        ["outdoor-seating", "cocktail-menu"],
      ),
      pricePoints: maybeDrop([
        { item: "Margherita Pizza", price: "$18" },
        { item: "Truffle Pizza", price: "$22" },
      ]),
      sentiment: { positive: 2 + Math.floor(Math.random() * 2), negative: Math.floor(Math.random() * 2), neutral: Math.floor(Math.random() * 2) },
      highlights: maybeDrop([
        varyText("Leopard-spotted crust from wood-fired oven"),
        varyText("Fresh black truffle shaved tableside"),
        "Owner is from Naples",
        varyText("Excellent house Montepulciano"),
      ]),
      warnings: maybeDrop([
        "Long waits even with reservation",
        "Expensive for pizza",
        "Inconsistent service",
      ]),
    }),

    "cafe-lumiere": () => ({
      name: "Café Lumière",
      cuisineType: "French Bistro",
      priceRange: "moderate" as const,
      overallRating: jitter(3.5),
      dishes: maybeAdd(
        maybeDrop([
          { name: "Croque Monsieur", sentiment: flipSentiment("positive") },
          { name: "French Onion Soup", sentiment: flipSentiment("positive") },
          { name: "Duck Confit", sentiment: flipSentiment("positive") },
          { name: "Frisée Salad", sentiment: flipSentiment("positive") },
          { name: "Crème Brûlée", sentiment: flipSentiment("neutral") },
          { name: "Eggs Benedict", sentiment: flipSentiment("positive") },
          { name: "French Toast", sentiment: flipSentiment("positive") },
          { name: "Steak Frites", sentiment: flipSentiment("negative") },
          { name: "Profiteroles", sentiment: flipSentiment("positive") },
        ]),
        [
          { name: "Escargot", sentiment: "positive" as const },
          { name: "Tarte Tatin", sentiment: "positive" as const },
        ],
      ),
      attributes: maybeAdd(
        maybeDrop([
          "patio-seating",
          "brunch",
          "prix-fixe-lunch",
          "well-curated-wine-list",
          "bottomless-mimosas",
        ]),
        ["dog-friendly-patio", "live-jazz-fridays"],
      ),
      pricePoints: maybeDrop([
        { item: "Prix Fixe Lunch", price: "$16" },
        { item: "Bottomless Mimosas", price: "$25" },
        { item: "Steak Frites", price: "$34" },
      ]),
      sentiment: { positive: 1 + Math.floor(Math.random() * 2), negative: 1 + Math.floor(Math.random() * 2), neutral: Math.floor(Math.random() * 2) },
      highlights: maybeDrop([
        varyText("Textbook croque monsieur"),
        varyText("Duck confit fall-off-the-bone tender"),
        varyText("Silky hollandaise on eggs Benedict"),
        varyText("Charming patio seating"),
      ]),
      warnings: maybeDrop([
        "Steak often overcooked",
        "Slow service on off-peak nights",
        "Gets packed by 11am for brunch",
      ]),
    }),
  };

  const extract = extractors[restaurantId];
  if (!extract) {
    throw new Error(`Unknown restaurant: ${restaurantId}. Available: ${Object.keys(extractors).join(", ")}`);
  }
  return extract();
}
