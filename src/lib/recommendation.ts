import { FlavorDimension, ParsedDrink, ParsedMenu, TasteProfile, Vibe, Adventure } from "./types";

export const FLAVOR_DIMENSIONS: FlavorDimension[] = [
  "boozy",
  "sweet",
  "sour",
  "bitter",
  "smoky",
  "herbal",
  "fruity",
  "creamy",
  "spicy",
  "refreshing"
];

// Calculate cosine similarity between two flavor-dimension profiles
export function cosineSimilarity(
  v1: Record<FlavorDimension, number>,
  v2: Record<FlavorDimension, number>
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const dim of FLAVOR_DIMENSIONS) {
    const val1 = v1[dim] ?? 0;
    const val2 = v2[dim] ?? 0;
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Blend user affinities with vibe profiles for cold start (ratingsCount < 3)
export function getBlendedProfile(
  profile: TasteProfile,
  vibe: Vibe
): Record<FlavorDimension, number> {
  const vibeAffinities: Record<Vibe, Record<FlavorDimension, number>> = {
    "winding-down": { boozy: 1, sweet: 5, sour: 5, bitter: 3, smoky: 2, herbal: 6, fruity: 6, creamy: 5, spicy: 2, refreshing: 8 },
    "celebrating": { boozy: 7, sweet: 7, sour: 6, bitter: 3, smoky: 3, herbal: 4, fruity: 8, creamy: 5, spicy: 4, refreshing: 7 },
    "date-night": { boozy: 5, sweet: 5, sour: 5, bitter: 6, smoky: 3, herbal: 7, fruity: 5, creamy: 4, spicy: 3, refreshing: 5 },
    "one-and-done": { boozy: 9, sweet: 4, sour: 4, bitter: 6, smoky: 7, herbal: 5, fruity: 4, creamy: 4, spicy: 5, refreshing: 2 }
  };

  const vibeAffs = vibeAffinities[vibe];
  const ratingsCount = profile.ratingsCount;

  if (ratingsCount >= 3) {
    return profile.affinities;
  }

  const weight = ratingsCount / 3;
  const blended: Record<FlavorDimension, number> = { ...profile.affinities };

  for (const key of FLAVOR_DIMENSIONS) {
    const userVal = profile.affinities[key] ?? 5;
    const vibeVal = vibeAffs[key] ?? 5;
    blended[key] = weight * userVal + (1 - weight) * vibeVal;
  }

  return blended;
}

// Modulate the similarity score based on vibe conditions
export function applyVibeModifiers(
  score: number,
  drink: ParsedDrink,
  vibe: Vibe
): number {
  let adjusted = score;

  if (vibe === "one-and-done") {
    // one-and-done boosts boozy strength copy focuses on "making it count"
    if (drink.abvCategory === "strong") adjusted += 0.2;
    if (drink.abvCategory === "low") adjusted -= 0.15;
    if (drink.abvCategory === "zero") adjusted -= 0.25;
    adjusted += (drink.flavorVector.boozy / 10) * 0.1;
  } else if (vibe === "winding-down") {
    // winding-down boosts refreshing & low-abv / zero-proof
    if (drink.abvCategory === "low" || drink.abvCategory === "zero") adjusted += 0.2;
    if (drink.abvCategory === "strong") adjusted -= 0.2;
    adjusted += (drink.flavorVector.refreshing / 10) * 0.1;
  } else if (vibe === "date-night") {
    // date-night penalizes extreme smoky/spicy outliers (keep conversation flowing)
    if (drink.flavorVector.smoky > 7) adjusted -= 0.3;
    if (drink.flavorVector.spicy > 7) adjusted -= 0.3;
  } else if (vibe === "celebrating") {
    // celebrating boosts sweet, fruity, standard/strong
    if (drink.abvCategory === "strong" || drink.abvCategory === "standard") adjusted += 0.1;
    adjusted += (drink.flavorVector.fruity / 10) * 0.05;
    adjusted += (drink.flavorVector.sweet / 10) * 0.05;
  }

  return adjusted;
}

// Recommend drinks from parsed menu based on profile and mood parameters
export function recommendDrink({
  menu,
  vibe,
  adventure,
  profile,
  excludeIds = [],
  zeroProof = false
}: {
  menu: ParsedMenu;
  vibe: Vibe;
  adventure: Adventure;
  profile: TasteProfile;
  excludeIds?: string[];
  zeroProof?: boolean;
}): { pick: ParsedDrink | null; runnerUp: ParsedDrink | null } {
  // 1. Filter zero-proof if requested
  let candidates = menu.drinks.filter(drink => {
    if (zeroProof) {
      return drink.abvCategory === "zero";
    }
    return true;
  });

  // 2. Filter exclusions (re-rolls)
  candidates = candidates.filter(drink => !excludeIds.includes(drink.id));

  // If no candidates, return null
  if (candidates.length === 0) {
    return { pick: null, runnerUp: null };
  }

  // 3. Get profile (either blended for cold start, or user affinities)
  const targetProfile = getBlendedProfile(profile, vibe);

  // 4. Score all candidates using cosine similarity & vibe modifiers
  let scoredDrinks = candidates.map(drink => {
    const similarity = cosineSimilarity(targetProfile, drink.flavorVector);
    const score = applyVibeModifiers(similarity, drink, vibe);
    return { drink, score };
  });

  // 5. Apply adventure filters
  if (adventure === "surprise") {
    // Perturb scores with small random noise
    scoredDrinks = scoredDrinks.map(({ drink, score }) => ({
      drink,
      score: score + (Math.random() - 0.5) * 0.3
    }));
  } else if (adventure === "new-territory") {
    // Penalize styles that the user has already tried to favor exploration
    scoredDrinks = scoredDrinks.map(({ drink, score }) => {
      const alreadyTried = profile.stylesTried.includes(drink.styleFamily);
      return {
        drink,
        score: alreadyTried ? score - 0.5 : score
      };
    });
  }

  // 6. Sort by score descending
  scoredDrinks.sort((a, b) => b.score - a.score);

  const pick = scoredDrinks[0]?.drink ?? null;
  const runnerUp = scoredDrinks[1]?.drink ?? null;

  return { pick, runnerUp };
}
