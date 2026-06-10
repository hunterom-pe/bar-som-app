import { DrinkRating, FlavorDimension, TasteProfile } from "./types";

const LOCAL_STORAGE_KEY = "spec_profile_v1";

const DEFAULT_AFFINITIES: Record<FlavorDimension, number> = {
  boozy: 5,
  sweet: 5,
  sour: 5,
  bitter: 5,
  smoky: 5,
  herbal: 5,
  fruity: 5,
  creamy: 5,
  spicy: 5,
  refreshing: 5
};

export const INITIAL_PROFILE: TasteProfile = {
  affinities: DEFAULT_AFFINITIES,
  ratingsCount: 0,
  history: [],
  stylesTried: []
};

// Pure mathematical updates for taste profile affinities based on rating feedback
export function calculateNewAffinities(
  current: Record<FlavorDimension, number>,
  drinkVector: Record<FlavorDimension, number>,
  rating: "loved" | "fine" | "nope"
): Record<FlavorDimension, number> {
  const updated = { ...current };

  for (const key of Object.keys(current) as FlavorDimension[]) {
    const val = current[key] ?? 5;
    const drinkVal = drinkVector[key] ?? 5;

    if (rating === "loved") {
      // Pull affinity 25% closer to the loved drink profile
      updated[key] = Math.max(0, Math.min(10, val + (drinkVal - val) * 0.25));
    } else if (rating === "nope") {
      // Push affinity 20% away from the disliked drink profile
      updated[key] = Math.max(0, Math.min(10, val - (drinkVal - val) * 0.20));
    } else {
      // Fine: Pull slightly (5%) closer
      updated[key] = Math.max(0, Math.min(10, val + (drinkVal - val) * 0.05));
    }
  }

  return updated;
}

export const ProfileStore = {
  getProfile(): TasteProfile {
    if (typeof window === "undefined") {
      return INITIAL_PROFILE;
    }
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to read profile from localStorage:", e);
    }
    return INITIAL_PROFILE;
  },

  saveProfile(profile: TasteProfile): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error("Failed to save profile to localStorage:", e);
    }
  },

  addRating(
    ratingData: Omit<DrinkRating, "timestamp">
  ): TasteProfile {
    const currentProfile = this.getProfile();
    const timestamp = new Date().toISOString();
    const newRating: DrinkRating = {
      ...ratingData,
      timestamp
    };

    const newHistory = [...currentProfile.history, newRating];
    const newAffinities = calculateNewAffinities(
      currentProfile.affinities,
      ratingData.flavorVector,
      ratingData.rating
    );

    const newStylesTried = [...currentProfile.stylesTried];
    if (!newStylesTried.includes(ratingData.styleFamily)) {
      newStylesTried.push(ratingData.styleFamily);
    }

    const updatedProfile: TasteProfile = {
      affinities: newAffinities,
      ratingsCount: currentProfile.ratingsCount + 1,
      history: newHistory,
      stylesTried: newStylesTried
    };

    this.saveProfile(updatedProfile);
    return updatedProfile;
  },

  resetPalate(): TasteProfile {
    this.saveProfile(INITIAL_PROFILE);
    return INITIAL_PROFILE;
  }
};
