export interface ReviewInput {
  restaurantId: string;
  reviews: string[];
}

export const REVIEWS: Record<string, ReviewInput> = {
  "golden-dragon": {
    restaurantId: "golden-dragon",
    reviews: [
      "The dan dan noodles here are unreal — perfect balance of numbing Sichuan peppercorn and chili oil. Hand-pulled noodles made fresh to order. The mapo tofu had me sweating but I couldn't stop. $14 for a massive bowl. Open late, which is a lifesaver.",
      "Went with a group and ordered family style. The kung pao chicken was solid but the real star is the cumin lamb — crispy, fragrant, addictive. Tea-smoked duck was dry though. Service is efficient but impersonal. 3.5/5.",
      "Hidden gem in Chinatown. The soup dumplings (xlb) have paper-thin skins and burst with broth. Turnip cake appetizer was perfectly crispy. BYOB which is great. Cash only, no reservations. 4.5/5.",
      "Been going here for 15 years. Quality has stayed consistent, which is rare. The hot pot in winter is the move — get the split base (spicy + mushroom). Portions are huge. Family-run, grandma still makes the dumpling wrappers by hand. 5/5.",
    ],
  },
  "the-rustic-oven": {
    restaurantId: "the-rustic-oven",
    reviews: [
      "Neapolitan pizza done right. The leopard-spotted crust from the wood-fired oven, the fresh buffalo mozzarella, the basil picked that morning — it's simple and perfect. Margherita is $18 but worth every penny. Small, loud, no reservations.",
      "Came for the pizza, stayed for the burrata appetizer. Creamy, fresh, with roasted tomatoes and a balsamic reduction. The diavola was spicy and great. Tiramisu for dessert was housemade and excellent. $$$ for pizza but the quality justifies it. 4/5.",
      "Disappointing visit. 45-minute wait with a reservation. Pizza was good but not $22-good. The arugula salad was drowning in oil. Server forgot our drinks twice. Maybe an off night? 2.5/5.",
      "The seasonal truffle pizza in fall is transcendent. They shave fresh black truffle tableside. Also love their house red — a Montepulciano that pairs perfectly. Great date spot, intimate candlelit room. Owner is from Naples, you can tell. 5/5.",
    ],
  },
  "cafe-lumiere": {
    restaurantId: "cafe-lumiere",
    reviews: [
      "Finally a French bistro that doesn't feel pretentious. The croque monsieur is textbook — bechamel, gruyere, thick-cut ham. Onion soup was rich and properly caramelized. $16 prix fixe lunch is a steal. Charming patio seating.",
      "The duck confit was fall-off-the-bone tender with perfectly crisped skin. Frisee salad with lardons and a poached egg to start. Creme brulee was fine but unremarkable. Wine list is small but well-curated. 4/5.",
      "Brunch here is the move. The eggs Benedict with hollandaise is silky, the French toast is brioche-thick and caramelized. Bottomless mimosas for $25. Gets packed by 11am, come early. Servers are lovely.",
      "Tried the steak frites — steak was overcooked (ordered medium-rare, got medium-well) and the bearnaise was broken. Disappointing for $34. The profiteroles saved the meal. Service was slow on a Tuesday which is inexcusable. 2/5.",
    ],
  },
};
