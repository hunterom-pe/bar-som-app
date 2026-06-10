import { DrinkRating, FlavorDimension, TasteProfile, ParsedDrink, MenuSearch } from "./types";
import { db } from "./firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc 
} from "firebase/firestore";

const LOCAL_STORAGE_KEY = "spec_profile_v1";
const LOCAL_FAVORITES_KEY = "spec_favorites_v1";
const LOCAL_SEARCHES_KEY = "spec_searches_v1";

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

// Local Storage Sync (Existing Offline Implementation)
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
  },

  // Offline Favorites LocalStorage Helper
  getFavoriteDrinksLocal(): ParsedDrink[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_FAVORITES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to read favorites from localStorage:", e);
    }
    return [];
  },

  saveFavoriteDrinksLocal(favorites: ParsedDrink[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error("Failed to save favorites to localStorage:", e);
    }
  },

  toggleFavoriteDrinkLocal(drink: ParsedDrink): boolean {
    const currentFavs = this.getFavoriteDrinksLocal();
    const existsIdx = currentFavs.findIndex(f => f.name.toLowerCase() === drink.name.toLowerCase());
    if (existsIdx > -1) {
      currentFavs.splice(existsIdx, 1);
      this.saveFavoriteDrinksLocal(currentFavs);
      return false; // unfavorited
    } else {
      currentFavs.unshift(drink);
      this.saveFavoriteDrinksLocal(currentFavs);
      return true; // favorited
    }
  },

  isDrinkFavoritedLocal(drinkName: string): boolean {
    const currentFavs = this.getFavoriteDrinksLocal();
    return currentFavs.some(f => f.name.toLowerCase() === drinkName.toLowerCase());
  },

  // Offline Searches LocalStorage Helper
  getMenuSearchesLocal(): MenuSearch[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_SEARCHES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to read searches from localStorage:", e);
    }
    return [];
  },

  saveMenuSearchesLocal(searches: MenuSearch[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_SEARCHES_KEY, JSON.stringify(searches));
    } catch (e) {
      console.error("Failed to save searches to localStorage:", e);
    }
  },

  saveMenuSearchLocal(
    barName: string,
    menuText: string,
    imageBase64: string | null,
    drinks: ParsedDrink[]
  ): void {
    const currentSearches = this.getMenuSearchesLocal();
    const newSearch = {
      id: "local_" + Date.now(),
      barName: barName || "Unknown Bar",
      menuText: menuText || "",
      imageBase64: imageBase64 || null,
      drinks,
      timestamp: new Date().toISOString()
    };
    currentSearches.unshift(newSearch);
    this.saveMenuSearchesLocal(currentSearches);
  }
};

// Firestore Sync (New Account-Based Implementation)
export const CloudProfileStore = {
  async getCloudProfile(uid: string): Promise<TasteProfile> {
    if (!db) return INITIAL_PROFILE;
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.palate) {
          return data.palate as TasteProfile;
        }
      }
      // Create empty profile doc in Firestore if missing
      await setDoc(userRef, { palate: INITIAL_PROFILE, createdAt: new Date().toISOString() }, { merge: true });
      return INITIAL_PROFILE;
    } catch (e) {
      console.error("Failed to fetch cloud profile:", e);
      return INITIAL_PROFILE;
    }
  },

  async saveCloudProfile(uid: string, profile: TasteProfile): Promise<void> {
    if (!db) return;
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { palate: profile }, { merge: true });
    } catch (e) {
      console.error("Failed to save cloud profile:", e);
    }
  },

  async addCloudRating(
    uid: string,
    ratingData: Omit<DrinkRating, "timestamp">
  ): Promise<TasteProfile> {
    const currentProfile = await this.getCloudProfile(uid);
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

    await this.saveCloudProfile(uid, updatedProfile);
    return updatedProfile;
  },

  async resetCloudPalate(uid: string): Promise<TasteProfile> {
    await this.saveCloudProfile(uid, INITIAL_PROFILE);
    return INITIAL_PROFILE;
  },

  async mergeOfflineProfileIntoCloud(uid: string, offlineProfile: TasteProfile): Promise<TasteProfile> {
    if (!db) return INITIAL_PROFILE;
    try {
      const cloudProfile = await this.getCloudProfile(uid);
      if (offlineProfile.history.length === 0) {
        return cloudProfile;
      }

      // Merge history lists, avoiding duplicates based on name + timestamp
      const cloudMap = new Map(cloudProfile.history.map(h => [`${h.drinkName}_${h.timestamp}`, h]));
      for (const h of offlineProfile.history) {
        cloudMap.set(`${h.drinkName}_${h.timestamp}`, h);
      }

      // Sort full history by timestamp ascending
      const mergedHistory = Array.from(cloudMap.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Re-run taste affinity math sequentially
      let currentAffinities = { ...DEFAULT_AFFINITIES };
      const stylesTried: typeof offlineProfile.stylesTried = [];

      for (const rating of mergedHistory) {
        currentAffinities = calculateNewAffinities(
          currentAffinities,
          rating.flavorVector,
          rating.rating
        );
        if (!stylesTried.includes(rating.styleFamily)) {
          stylesTried.push(rating.styleFamily);
        }
      }

      const mergedProfile: TasteProfile = {
        affinities: currentAffinities,
        ratingsCount: mergedHistory.length,
        history: mergedHistory,
        stylesTried
      };

      await this.saveCloudProfile(uid, mergedProfile);
      return mergedProfile;
    } catch (e) {
      console.error("Failed to merge offline profile into cloud:", e);
      return INITIAL_PROFILE;
    }
  },

  // Searches/Menus History Collection
  async saveMenuSearch(
    uid: string,
    barName: string,
    menuText: string,
    imageBase64: string | null,
    drinks: ParsedDrink[]
  ): Promise<void> {
    if (!db) return;
    try {
      const searchesRef = collection(db, "users", uid, "searches");
      await addDoc(searchesRef, {
        barName: barName || "Unknown Bar",
        menuText: menuText || "",
        imageBase64: imageBase64 || null,
        drinks,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to save menu search to cloud:", e);
    }
  },

  async getMenuSearches(uid: string): Promise<MenuSearch[]> {
    if (!db) return [];
    try {
      const searchesRef = collection(db, "users", uid, "searches");
      const q = query(searchesRef, orderBy("timestamp", "desc"));
      const querySnap = await getDocs(q);
      return querySnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          barName: data.barName || "Unknown Bar",
          menuText: data.menuText || "",
          imageBase64: data.imageBase64 || null,
          drinks: data.drinks || [],
          timestamp: data.timestamp || new Date().toISOString()
        } as MenuSearch;
      });
    } catch (e) {
      console.error("Failed to fetch menu searches:", e);
      return [];
    }
  },

  // Favorites Subcollection
  async toggleFavoriteDrink(uid: string, drink: ParsedDrink): Promise<boolean> {
    if (!db) return false;
    try {
      // Use sanitized drink name as document ID to avoid duplicates
      const drinkDocId = encodeURIComponent(drink.name.trim().toLowerCase());
      const favDocRef = doc(db, "users", uid, "favorites", drinkDocId);
      const favSnap = await getDoc(favDocRef);

      if (favSnap.exists()) {
        await deleteDoc(favDocRef);
        return false; // unfavorited
      } else {
        await setDoc(favDocRef, {
          ...drink,
          addedAt: new Date().toISOString()
        });
        return true; // favorited
      }
    } catch (e) {
      console.error("Failed to toggle favorite drink:", e);
      return false;
    }
  },

  async getFavoriteDrinks(uid: string): Promise<ParsedDrink[]> {
    if (!db) return [];
    try {
      const favsRef = collection(db, "users", uid, "favorites");
      const q = query(favsRef, orderBy("addedAt", "desc"));
      const querySnap = await getDocs(q);
      return querySnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          price: data.price,
          ingredients: data.ingredients,
          baseSpirits: data.baseSpirits,
          styleFamily: data.styleFamily,
          flavorVector: data.flavorVector,
          abvCategory: data.abvCategory,
          confidence: data.confidence
        } as ParsedDrink;
      });
    } catch (e) {
      console.error("Failed to fetch favorite drinks:", e);
      return [];
    }
  },

  async isDrinkFavorited(uid: string, drinkName: string): Promise<boolean> {
    if (!db) return false;
    try {
      const drinkDocId = encodeURIComponent(drinkName.trim().toLowerCase());
      const favDocRef = doc(db, "users", uid, "favorites", drinkDocId);
      const favSnap = await getDoc(favDocRef);
      return favSnap.exists();
    } catch (e) {
      console.error("Failed to check if drink is favorited:", e);
      return false;
    }
  }
};
