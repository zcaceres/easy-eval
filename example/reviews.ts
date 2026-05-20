export interface ReviewInput {
  restaurantId: string;
  reviews: string[];
}

export const REVIEWS: Record<string, ReviewInput> = {
  "joes-pizza": {
    restaurantId: "joes-pizza",
    reviews: [
      "Best NY-style pizza I've ever had. The plain slice is perfection — thin, crispy, with that perfect fold. Cash only, no frills, just incredible pizza. $3.50 a slice. Been coming here since 1985.",
      "Waited 20 minutes in line but worth it. Got the pepperoni and a cannoli. The crust has that beautiful char from the coal oven. Loud, crowded, quintessential NYC experience. 4.5/5.",
      "Decent pizza but honestly overhyped. The margherita was good, not life-changing. Service was brusque. Prices have gone up — $5 for a plain slice now. Still, it's a solid 3.5/5 for the neighborhood.",
      "This is the real deal. Fresh mozzarella, San Marzano tomatoes, you can taste the quality. The garlic knots are a must-order. Family-owned for three generations. 5 stars.",
    ],
  },
  "sakura-sushi": {
    restaurantId: "sakura-sushi",
    reviews: [
      "Omakase was phenomenal — 12 courses, each more beautiful than the last. The uni was the best I've had outside of Tokyo. Chef Tanaka sources fish daily from Tsukiji. $185 per person, absolutely worth it.",
      "Sat at the bar and watched the chefs work. The attention to detail is unreal. Highlights: otoro, A5 wagyu nigiri, and the yuzu sorbet to finish. Sake pairing was excellent. Michelin-worthy.",
      "Beautiful presentation but portions are tiny for the price. The hamachi was exceptional but I left hungry after the $150 prix fixe. Wine list is overpriced. 3.5/5.",
      "Best sushi in the city, period. The rice is seasoned perfectly — slightly warm, hint of vinegar. Reservation took 3 weeks. Intimate 20-seat room. Skip the rolls, trust the chef. 5/5.",
    ],
  },
  "marias-cantina": {
    restaurantId: "marias-cantina",
    reviews: [
      "The best tacos al pastor I've had north of Mexico City. The pineapple salsa is made fresh every hour. Margaritas are strong and cheap — $8 happy hour. Colorful, lively atmosphere. 4/5.",
      "Came for the mole and was not disappointed. Rich, complex, with a subtle chocolate finish. The churros are incredible too. Family-run spot, Maria herself took our order. Cash and card accepted.",
      "Good food but LOUD. Hard to have a conversation on a Friday night. The elote and queso fundido are standout appetizers. Guac is made tableside. Portions are generous. 3.5/5.",
      "Went for brunch — the chilaquiles are life-changing. Breakfast burrito was massive and only $12. Horchata is housemade. They have a nice patio out back. Vegan options available. 4.5/5.",
    ],
  },
};
