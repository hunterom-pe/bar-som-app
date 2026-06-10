import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ProfileStore, calculateNewAffinities, INITIAL_PROFILE } from "../../src/lib/profile-store";
import { DrinkRating } from "../../src/lib/types";

describe("calculateNewAffinities", () => {
  const current = {
    boozy: 5, sweet: 5, sour: 5, bitter: 5, smoky: 5, herbal: 5, fruity: 5, creamy: 5, spicy: 5, refreshing: 5
  };

  it("pulls affinity closer for loved rating", () => {
    const drinkVector = {
      boozy: 9, sweet: 1, sour: 1, bitter: 9, smoky: 1, herbal: 1, fruity: 1, creamy: 1, spicy: 1, refreshing: 1
    };
    const updated = calculateNewAffinities(current, drinkVector, "loved");
    // Boozy 5 -> 9: val + (9 - 5)*0.25 = 5 + 1 = 6
    expect(updated.boozy).toBe(6);
    // Sweet 5 -> 1: val + (1 - 5)*0.25 = 5 - 1 = 4
    expect(updated.sweet).toBe(4);
  });

  it("pushes affinity away for nope rating", () => {
    const drinkVector = {
      boozy: 9, sweet: 1, sour: 1, bitter: 9, smoky: 1, herbal: 1, fruity: 1, creamy: 1, spicy: 1, refreshing: 1
    };
    const updated = calculateNewAffinities(current, drinkVector, "nope");
    // Boozy 5 -> 9: val - (9 - 5)*0.20 = 5 - 0.8 = 4.2
    expect(updated.boozy).toBeCloseTo(4.2, 5);
  });
});

class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value.toString();
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

const localStorageInstance = new LocalStorageMock();

describe("ProfileStore localStorage wrapper", () => {
  beforeEach(() => {
    localStorageInstance.clear();
    vi.stubGlobal("localStorage", localStorageInstance);
    vi.stubGlobal("window", {
      localStorage: localStorageInstance
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns default profile if empty", () => {
    const profile = ProfileStore.getProfile();
    expect(profile.ratingsCount).toBe(0);
    expect(profile.affinities.boozy).toBe(5);
  });

  it("saves and loads custom profile", () => {
    const custom = {
      ...INITIAL_PROFILE,
      ratingsCount: 5
    };
    ProfileStore.saveProfile(custom);
    const loaded = ProfileStore.getProfile();
    expect(loaded.ratingsCount).toBe(5);
  });

  it("updates profile correctly when adding a rating", () => {
    const rating: Omit<DrinkRating, "timestamp"> = {
      drinkName: "Old Fashioned",
      styleFamily: "old-fashioned",
      flavorVector: {
        boozy: 8, sweet: 3, sour: 1, bitter: 7, smoky: 2, herbal: 2, fruity: 2, creamy: 1, spicy: 2, refreshing: 2
      },
      rating: "loved",
      vibe: "one-and-done"
    };

    const updated = ProfileStore.addRating(rating);
    expect(updated.ratingsCount).toBe(1);
    expect(updated.stylesTried).toContain("old-fashioned");
    expect(updated.history.length).toBe(1);
    expect(updated.history[0].drinkName).toBe("Old Fashioned");
    expect(updated.history[0].timestamp).toBeDefined();
    // check affinity update: boozy 5 -> 8 loved: 5 + 3 * 0.25 = 5.75
    expect(updated.affinities.boozy).toBe(5.75);
  });

  it("resets profile to initial on resetPalate", () => {
    const custom = {
      ...INITIAL_PROFILE,
      ratingsCount: 5
    };
    ProfileStore.saveProfile(custom);
    const reset = ProfileStore.resetPalate();
    expect(reset.ratingsCount).toBe(0);
    expect(ProfileStore.getProfile().ratingsCount).toBe(0);
  });
});
