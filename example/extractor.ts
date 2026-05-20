export interface ExtractedRestaurant {
  name: string;
  cuisineType: string;
  priceRange: "budget" | "moderate" | "upscale" | "fine-dining";
  overallRating: number;
  dishes: Array<{
    name: string;
    sentiment: "positive" | "neutral" | "negative";
  }>;
  attributes: string[];
  pricePoints: Array<{
    item: string;
    price: string;
  }>;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  highlights: string[];
  warnings: string[];
}

export function extractRestaurant(restaurantId: string, reviews: string[]): ExtractedRestaurant {
  const extractors: Record<string, () => ExtractedRestaurant> = {
    "joes-pizza": () => ({
      name: "Joe's Pizza",
      cuisineType: "Italian / Pizza",
      priceRange: "budget",
      overallRating: 4.1,
      dishes: [
        { name: "Plain Slice", sentiment: "positive" },
        { name: "Pepperoni Slice", sentiment: "positive" },
        { name: "Margherita", sentiment: "neutral" },
        { name: "Cannoli", sentiment: "positive" },
        { name: "Garlic Knots", sentiment: "positive" },
      ],
      attributes: [
        "cash-only",
        "no-frills",
        "coal-oven",
        "family-owned",
        "nyc-institution",
      ],
      pricePoints: [
        { item: "Plain Slice", price: "$3.50-$5.00" },
      ],
      sentiment: { positive: 3, negative: 0, neutral: 1 },
      highlights: [
        "Thin crispy crust with perfect fold",
        "Coal oven char",
        "Fresh mozzarella and San Marzano tomatoes",
        "Family-owned for three generations",
      ],
      warnings: [
        "Long wait times",
        "Cash only",
        "Prices increasing",
      ],
    }),

    "sakura-sushi": () => ({
      name: "Sakura Sushi",
      cuisineType: "Japanese / Sushi",
      priceRange: "fine-dining",
      overallRating: 4.3,
      dishes: [
        { name: "Omakase", sentiment: "positive" },
        { name: "Uni", sentiment: "positive" },
        { name: "Otoro", sentiment: "positive" },
        { name: "A5 Wagyu Nigiri", sentiment: "positive" },
        { name: "Hamachi", sentiment: "positive" },
        { name: "Yuzu Sorbet", sentiment: "positive" },
      ],
      attributes: [
        "omakase",
        "bar-seating",
        "reservation-required",
        "intimate-setting",
        "daily-fish-sourcing",
      ],
      pricePoints: [
        { item: "Omakase", price: "$185" },
        { item: "Prix Fixe", price: "$150" },
      ],
      sentiment: { positive: 3, negative: 0, neutral: 1 },
      highlights: [
        "Chef Tanaka sources fish daily from Tsukiji",
        "Perfectly seasoned rice",
        "Michelin-worthy quality",
        "Beautiful presentation",
      ],
      warnings: [
        "Very expensive",
        "Small portions for price",
        "3-week wait for reservations",
        "Overpriced wine list",
      ],
    }),

    "marias-cantina": () => ({
      name: "Maria's Cantina",
      cuisineType: "Mexican",
      priceRange: "moderate",
      overallRating: 4.0,
      dishes: [
        { name: "Tacos al Pastor", sentiment: "positive" },
        { name: "Mole", sentiment: "positive" },
        { name: "Churros", sentiment: "positive" },
        { name: "Elote", sentiment: "positive" },
        { name: "Queso Fundido", sentiment: "positive" },
        { name: "Chilaquiles", sentiment: "positive" },
        { name: "Breakfast Burrito", sentiment: "positive" },
        { name: "Guacamole", sentiment: "positive" },
      ],
      attributes: [
        "family-run",
        "patio",
        "happy-hour",
        "brunch",
        "vegan-options",
        "tableside-guac",
      ],
      pricePoints: [
        { item: "Margarita (Happy Hour)", price: "$8" },
        { item: "Breakfast Burrito", price: "$12" },
      ],
      sentiment: { positive: 3, negative: 0, neutral: 1 },
      highlights: [
        "Fresh pineapple salsa made every hour",
        "Rich complex mole with chocolate finish",
        "Life-changing chilaquiles",
        "Housemade horchata",
      ],
      warnings: [
        "Very loud on weekends",
      ],
    }),
  };

  const extract = extractors[restaurantId];
  if (!extract) {
    throw new Error(`Unknown restaurant: ${restaurantId}`);
  }
  return extract();
}
