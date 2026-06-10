import { describe, expect, it } from "vitest";
import { cosineSimilarity, getBlendedProfile, applyVibeModifiers, recommendDrink } from "../../src/lib/recommendation";
import { ParsedDrink, ParsedMenu, TasteProfile } from "../../src/lib/types";

// Helper to create neutral flavor record
const createFlavor = (overrides: Partial<Record<string, number>> = {}): Record<string, number> => {
  return {
    boozy: 5, sweet: 5, sour: 5, bitter: 5, smoky: 5, herbal: 5, fruity: 5, creamy: 5, spicy: 5, refreshing: 5,
    ...overrides
  } as Record<string, number>;
};

// Fixture drinks
const drinkOldFashioned: ParsedDrink = {
  id: "of",
  name: "Old Fashioned",
  styleFamily: "old-fashioned",
  ingredients: ["Bourbon", "Angostura Bitters", "Sugar"],
  baseSpirits: ["bourbon"],
  flavorVector: createFlavor({ boozy: 8, bitter: 6, sweet: 4 }),
  abvCategory: "strong",
  confidence: 1
};

const drinkPaloma: ParsedDrink = {
  id: "paloma",
  name: "Paloma",
  styleFamily: "highball",
  ingredients: ["Tequila", "Grapefruit Soda", "Lime"],
  baseSpirits: ["tequila"],
  flavorVector: createFlavor({ refreshing: 8, sour: 7, fruity: 6 }),
  abvCategory: "standard",
  confidence: 1
};

const drinkSmokyMezcal: ParsedDrink = {
  id: "smoky-mezcal",
  name: "Smoke Show",
  styleFamily: "sour",
  ingredients: ["Mezcal", "Lime", "Agave"],
  baseSpirits: ["mezcal"],
  flavorVector: createFlavor({ smoky: 9, sour: 6, sweet: 4 }),
  abvCategory: "standard",
  confidence: 1
};

const drinkSpicyMargarita: ParsedDrink = {
  id: "spicy-marg",
  name: "Jalapeno Margarita",
  styleFamily: "sour",
  ingredients: ["Tequila", "Lime", "Triple Sec", "Jalapeno"],
  baseSpirits: ["tequila"],
  flavorVector: createFlavor({ spicy: 9, sour: 7, sweet: 4 }),
  abvCategory: "standard",
  confidence: 1
};

const drinkVirginMojito: ParsedDrink = {
  id: "virgin-mojito",
  name: "Virgin Mojito",
  styleFamily: "highball",
  ingredients: ["Mint", "Lime", "Sugar", "Soda"],
  baseSpirits: [],
  flavorVector: createFlavor({ refreshing: 8, sweet: 5, sour: 6 }),
  abvCategory: "zero",
  confidence: 1
};

const mockMenu: ParsedMenu = {
  drinks: [drinkOldFashioned, drinkPaloma, drinkSmokyMezcal, drinkSpicyMargarita, drinkVirginMojito],
  warnings: []
};

const defaultProfile: TasteProfile = {
  affinities: createFlavor(),
  ratingsCount: 0,
  history: [],
  stylesTried: []
};

describe("cosineSimilarity", () => {
  it("calculates exact similarity for identical profiles", () => {
    const p1 = createFlavor({ boozy: 8 });
    const p2 = createFlavor({ boozy: 8 });
    expect(cosineSimilarity(p1, p2)).toBeCloseTo(1.0, 5);
  });

  it("calculates lower similarity for opposing profiles", () => {
    // Other values are 5, so it won't be perfectly 0, but it should be lower
    const p3 = { boozy: 10, sweet: 0, sour: 0, bitter: 0, smoky: 0, herbal: 0, fruity: 0, creamy: 0, spicy: 0, refreshing: 0 };
    const p4 = { boozy: 0, sweet: 10, sour: 0, bitter: 0, smoky: 0, herbal: 0, fruity: 0, creamy: 0, spicy: 0, refreshing: 0 };
    expect(cosineSimilarity(p3, p4)).toBe(0);
  });
});

describe("getBlendedProfile (Cold Start Handling)", () => {
  it("returns user profile if ratingsCount >= 3", () => {
    const customProfile: TasteProfile = {
      affinities: createFlavor({ boozy: 10 }),
      ratingsCount: 3,
      history: [],
      stylesTried: []
    };
    const blended = getBlendedProfile(customProfile, "one-and-done");
    expect(blended.boozy).toBe(10);
  });

  it("returns vibe profile if ratingsCount is 0", () => {
    const blended = getBlendedProfile(defaultProfile, "one-and-done");
    // vibe profile for one-and-done has boozy: 9
    expect(blended.boozy).toBe(9);
    // and refreshing: 2
    expect(blended.refreshing).toBe(2);
  });

  it("blends user profile with vibe profile if 0 < ratingsCount < 3", () => {
    const userProfile: TasteProfile = {
      affinities: createFlavor({ boozy: 3 }),
      ratingsCount: 1, // weight = 1/3 = 0.333
      history: [],
      stylesTried: []
    };
    const blended = getBlendedProfile(userProfile, "one-and-done");
    // User boozy is 3, vibe boozy is 9.
    // Blended: (1/3 * 3) + (2/3 * 9) = 1 + 6 = 7
    expect(blended.boozy).toBeCloseTo(7.0, 5);
  });
});

describe("applyVibeModifiers", () => {
  it("one-and-done vibe boosts strong drinks and boozy vectors", () => {
    const scoreStrong = applyVibeModifiers(0.5, drinkOldFashioned, "one-and-done");
    const scoreLow = applyVibeModifiers(0.5, drinkVirginMojito, "one-and-done");
    expect(scoreStrong).toBeGreaterThan(0.5);
    expect(scoreLow).toBeLessThan(0.5);
  });

  it("winding-down vibe boosts low/zero abv and refreshing vectors", () => {
    const scoreZero = applyVibeModifiers(0.5, drinkVirginMojito, "winding-down");
    const scoreStrong = applyVibeModifiers(0.5, drinkOldFashioned, "winding-down");
    expect(scoreZero).toBeGreaterThan(0.5);
    expect(scoreStrong).toBeLessThan(0.5);
  });

  it("date-night vibe penalizes extreme smoky/spicy outliers", () => {
    const scoreSmoky = applyVibeModifiers(0.5, drinkSmokyMezcal, "date-night");
    const scoreNormal = applyVibeModifiers(0.5, drinkPaloma, "date-night");
    expect(scoreSmoky).toBeLessThan(0.5);
    expect(scoreNormal).toBe(0.5); // Paloma has no smoky/spicy outliers (>7)
  });
});

describe("recommendDrink", () => {
  it("returns highest scored drink in safe mode", () => {
    // If we want a refreshing drink, profile affinities are high refreshing
    const profile: TasteProfile = {
      affinities: createFlavor({ refreshing: 10 }),
      ratingsCount: 3,
      history: [],
      stylesTried: []
    };
    const { pick, runnerUp } = recommendDrink({
      menu: mockMenu,
      vibe: "winding-down",
      adventure: "safe",
      profile
    });
    // Winding down + refreshing affinities should pick Virgin Mojito (zero proof/refreshing gets boost)
    expect(pick).toBeDefined();
    expect(pick?.id).toBe("virgin-mojito");
    expect(runnerUp?.id).toBe("paloma");
  });

  it("filters to zeroProof when selected", () => {
    const { pick, runnerUp } = recommendDrink({
      menu: mockMenu,
      vibe: "winding-down",
      adventure: "safe",
      profile: defaultProfile,
      zeroProof: true
    });
    expect(pick?.id).toBe("virgin-mojito");
    expect(runnerUp).toBeNull(); // Only one zero-proof drink in the menu
  });

  it("excludes specified drink ids (re-rolls)", () => {
    const profile: TasteProfile = {
      affinities: createFlavor({ refreshing: 10 }),
      ratingsCount: 3,
      history: [],
      stylesTried: []
    };
    const { pick } = recommendDrink({
      menu: mockMenu,
      vibe: "winding-down",
      adventure: "safe",
      profile,
      excludeIds: ["paloma"]
    });
    expect(pick?.id).not.toBe("paloma");
  });

  it("prioritizes new styles in new-territory adventure mode", () => {
    const profile: TasteProfile = {
      affinities: createFlavor({ refreshing: 10, boozy: 8 }),
      ratingsCount: 3,
      history: [],
      stylesTried: ["highball"] // Paloma style is highball, Old Fashioned style is old-fashioned
    };
    const { pick } = recommendDrink({
      menu: mockMenu,
      vibe: "celebrating",
      adventure: "new-territory",
      profile
    });
    // Old Fashioned style is not tried, and vibe is celebrating, so Old Fashioned wins.
    expect(pick?.id).toBe("of");
  });

  it("handles empty menus gracefully", () => {
    const { pick, runnerUp } = recommendDrink({
      menu: { drinks: [], warnings: [] },
      vibe: "winding-down",
      adventure: "safe",
      profile: defaultProfile
    });
    expect(pick).toBeNull();
    expect(runnerUp).toBeNull();
  });
});
