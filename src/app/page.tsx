"use client";

import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, isFirebaseEnabled } from "@/lib/firebase";
import { ParsedDrink, ParsedMenu, TasteProfile, Vibe, Adventure, DrinkRating } from "@/lib/types";
import { ProfileStore, CloudProfileStore } from "@/lib/profile-store";
import { PalateChart } from "@/components/PalateChart";
import { compressImage } from "@/lib/image";
import SplashScreen from "@/app/components/SplashScreen";
import AuthScreen from "@/app/components/AuthScreen";
import CocktailVisualizer from "@/app/components/CocktailVisualizer";

const BARTENDER_ISMS = [
  "Stirring up the algorithms...",
  "Polishing the glassware...",
  "Squeezing fresh citrus...",
  "Chilling the shaker...",
  "Checking the spec sheet...",
  "Muddling the options...",
  "Cracking the ice...",
  "Measuring the proportions..."
];

const getApiUrl = (path: string): string => {
  if (
    typeof window !== "undefined" &&
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  ) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://bar-som-app.netlify.app";
    return `${baseUrl}${path}`;
  }
  return path;
};

const getDiagnosticLog = (progress: number): string => {
  if (progress < 15) return "Initializing optical character reader...";
  if (progress < 30) return "Adjusting lens contrast & camera skew...";
  if (progress < 50) return "Binarizing text frames & mapping coordinates...";
  if (progress < 65) return "AI: Identifying cocktail names & pricing blocks...";
  if (progress < 80) return "SOMM: Translating flavor profiles and botanicals...";
  if (progress < 92) return "Matching drink characteristics with your palate...";
  return "Optimizing final cocktail selections...";
};

// --- Premium SVG Icons ---
function CameraIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function StarIcon({ className = "w-5 h-5", filled = false }: { className?: string, filled?: boolean }) {
  return (
    <svg className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.772-.564-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
    </svg>
  );
}

function HistoryIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MartiniIcon({ className = "w-16 h-16 text-amber-500" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14l-7 8-7-8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v8m-4 0h8" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <line x1="10" y1="5" x2="13.5" y2="8.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function LightBulbIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ShakeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8a3 3 0 010 8m18-8a3 3 0 010 8" />
    </svg>
  );
}

function HeartIcon({ className = "w-5 h-5", filled = false }: { className?: string, filled?: boolean }) {
  return (
    <svg className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function MehIcon({ className = "w-5 h-5", filled = false }: { className?: string, filled?: boolean }) {
  return (
    <svg className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="15" x2="15" y2="15" strokeLinecap="round" />
      <circle cx="9.5" cy="10.5" r="1.5" fill={filled ? "currentColor" : "none"} />
      <circle cx="14.5" cy="10.5" r="1.5" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}

function ThumbsDownIcon({ className = "w-5 h-5", filled = false }: { className?: string, filled?: boolean }) {
  return (
    <svg className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 012 2v3.667C14.754 11.412 16.18 13.102 18 14V21m-4-7h2a2 2 0 002-2V9a2 2 0 00-2-2h-3v1z" />
    </svg>
  );
}

function CheckIcon({ className = "w-16 h-16 text-green-500" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function KeyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2a2 2 0 012-2m0 0a2 2 0 00-2-2m2 2h2a2 2 0 012 2v2a2 2 0 01-2 2H9M3 18l6-6M3 18l-1-1m1 1v1m4-4H5m3 2h2m-2-2v2" />
    </svg>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  // Auth & Onboarding States
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  interface MenuSearch {
    id: string;
    barName: string;
    menuText: string;
    imageBase64: string | null;
    drinks: ParsedDrink[];
    timestamp: string;
  }

  const [favorites, setFavorites] = useState<ParsedDrink[]>([]);
  const [menuSearches, setMenuSearches] = useState<MenuSearch[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeHistoryDrink, setActiveHistoryDrink] = useState<DrinkRating | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Age Gate States
  const [ageGateCompleted, setAgeGateCompleted] = useState<boolean | null>(null);
  const [ageGateError, setAgeGateError] = useState(false);
  
  // Sommelier views
  const [currentView, setCurrentView] = useState<
    "landing" | "paste-menu" | "image-preview" | "parsing" | "mood-questions" | "recommendation" | "rating" | "palate" | "favorites" | "history"
  >("landing");

  const [menuText, setMenuText] = useState("");
  const [menuImage, setMenuImage] = useState<string | null>(null);
  const [parsedMenu, setParsedMenu] = useState<ParsedMenu | null>(null);
  
  // Mood states
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [zeroProof, setZeroProof] = useState(false);
  const [moodStep, setMoodStep] = useState<1 | 2>(1); // 1 = Vibe, 2 = Adventure
  
  // Recommendation states
  const [recommendation, setRecommendation] = useState<{
    pick: ParsedDrink | null;
    justification: string;
    customization: string;
    runnerUp: ParsedDrink | null;
    runnerUpJustification: string;
    runnerUpCustomization: string;
  } | null>(null);
  
  const [activePick, setActivePick] = useState<ParsedDrink | null>(null);
  const [activeJustification, setActiveJustification] = useState("");
  const [activeCustomization, setActiveCustomization] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [shakePermission, setShakePermission] = useState<boolean | null>(null);
  const [reRollCount, setReRollCount] = useState(0); // Max 2
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  
  // Parsing states
  const [bartenderIsm, setBartenderIsm] = useState(BARTENDER_ISMS[0]);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Profile state
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  
  // Rating states
  const [ratingDrink, setRatingDrink] = useState<ParsedDrink | null>(null);
  const [showRatingFeedback, setShowRatingFeedback] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data helper (favorites & searches history)
  const loadUserData = async (currentUser: User | null, isOffline: boolean) => {
    if (currentUser && !isOffline) {
      const p = await CloudProfileStore.getCloudProfile(currentUser.uid);
      setProfile(p);
      const favs = await CloudProfileStore.getFavoriteDrinks(currentUser.uid);
      setFavorites(favs);
      const searches = await CloudProfileStore.getMenuSearches(currentUser.uid);
      setMenuSearches(searches);
    } else {
      setProfile(ProfileStore.getProfile());
      setFavorites(ProfileStore.getFavoriteDrinksLocal());
      setMenuSearches(ProfileStore.getMenuSearchesLocal());
    }
  };

  // Mount check and Firebase setup
  useEffect(() => {
    const timer = setTimeout(() => {
      // Load age gate status
      const gate = localStorage.getItem("spec_age_gate");
      setAgeGateCompleted(gate === "true");
      setMounted(true);
    }, 0);

    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }

    // Set up Firebase Auth listener if active
    let unsubscribe = () => {};
    let offlineTimer: NodeJS.Timeout;

    if (isFirebaseEnabled() && auth) {
      unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
        setAuthLoading(true);
        if (currentUser) {
          setUser(currentUser);
          setOfflineMode(false);
          
          // Merge offline local profile into the newly logged-in cloud account
          const offlineProfile = ProfileStore.getProfile();
          const merged = await CloudProfileStore.mergeOfflineProfileIntoCloud(currentUser.uid, offlineProfile);
          setProfile(merged);
          
          // Reset local profile storage to avoid duplicate merges in the future
          ProfileStore.resetPalate();
          
          // Load user favorites & scanned searches
          const favs = await CloudProfileStore.getFavoriteDrinks(currentUser.uid);
          setFavorites(favs);
          const searches = await CloudProfileStore.getMenuSearches(currentUser.uid);
          setMenuSearches(searches);
        } else {
          setUser(null);
          // Load local storage fallback
          await loadUserData(null, true);
        }
        setAuthLoading(false);
      });
    } else {
      // Fallback directly to offline local storage if Firebase is disabled or missing credentials
      offlineTimer = setTimeout(() => {
        setOfflineMode(true);
        setAuthLoading(false);
        loadUserData(null, true);
      }, 0);
    }

    return () => {
      clearTimeout(timer);
      if (offlineTimer) {
        clearTimeout(offlineTimer);
      }
      unsubscribe();
    };
  }, []);

  // Check if current drink recommendation is favorited
  useEffect(() => {
    const checkIsFavorited = async () => {
      if (!activePick) {
        setIsFavorited(false);
        return;
      }
      if (user && !offlineMode) {
        const fav = await CloudProfileStore.isDrinkFavorited(user.uid, activePick.name);
        setIsFavorited(fav);
      } else {
        const fav = ProfileStore.isDrinkFavoritedLocal(activePick.name);
        setIsFavorited(fav);
      }
    };
    checkIsFavorited();
  }, [activePick, user, offlineMode]);

  // Bartender-ism rotation loop during loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentView === "parsing" || isLoadingRecommendation) {
      interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * BARTENDER_ISMS.length);
        setBartenderIsm(BARTENDER_ISMS[randomIndex]);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [currentView, isLoadingRecommendation]);

  // Loading progress bar simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isParsingOrRecommending = currentView === "parsing" || isLoadingRecommendation;
    
    if (isParsingOrRecommending) {
      const resetTimer = setTimeout(() => {
        setLoadingProgress(0);
      }, 0);

      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const remaining = 95 - prev;
          const increment = Math.max(1, Math.min(8, Math.random() * (remaining * 0.15)));
          return Math.min(95, prev + increment);
        });
      }, 450);

      return () => {
        clearTimeout(resetTimer);
        if (interval) clearInterval(interval);
      };
    } else {
      const completionTimer = setTimeout(() => {
        setLoadingProgress(100);
      }, 0);

      return () => {
        clearTimeout(completionTimer);
      };
    }
  }, [currentView, isLoadingRecommendation]);

  // Check shake permission compatibility on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const DeviceMotion = (window as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (!DeviceMotion || typeof DeviceMotion.requestPermission !== "function") {
        setShakePermission(true);
      }
    }
  }, []);

  const requestShakePermission = async () => {
    if (typeof window === "undefined") return;
    const DeviceMotion = (window as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };

    if (DeviceMotion && typeof DeviceMotion.requestPermission === "function") {
      try {
        const response = await DeviceMotion.requestPermission();
        if (response === "granted") {
          setShakePermission(true);
        } else {
          setShakePermission(false);
        }
      } catch (err) {
        console.error("DeviceMotion permission request failed:", err);
        setShakePermission(false);
      }
    } else {
      setShakePermission(true);
    }
  };

  const triggerShakeFlow = () => {
    if (isShaking || !parsedMenu) return;
    setIsShaking(true);
    
    // Animate shaker for 1.8 seconds, then trigger adventurous recommendation
    setTimeout(async () => {
      setIsShaking(false);
      
      // Select a random vibe
      const vibes: Vibe[] = ["winding-down", "celebrating", "date-night", "one-and-done"];
      const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];
      setVibe(randomVibe);
      setAdventure("surprise");
      
      // Call recommendation API directly
      await getRecommendation(randomVibe, "surprise");
    }, 1800);
  };

  // DeviceMotion Accelerometer Hook for Shake Detection
  useEffect(() => {
    if (!parsedMenu || currentView !== "mood-questions" || isShaking || isLoadingRecommendation) return;

    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;
    let lastUpdate = 0;
    const SHAKE_THRESHOLD = 15; // acceleration change threshold in m/s^2

    const handleMotionEvent = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration;
      if (!acceleration) return;

      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;

      const currentTime = Date.now();
      const diffTime = currentTime - lastUpdate;

      if (diffTime > 100) { // check every 100ms
        if (lastX !== null && lastY !== null && lastZ !== null) {
          const deltaX = Math.abs(x - lastX);
          const deltaY = Math.abs(y - lastY);
          const deltaZ = Math.abs(z - lastZ);

          // If change on any two axes is significant, trigger shake
          const isSignificantChange = 
            (deltaX > SHAKE_THRESHOLD && deltaY > SHAKE_THRESHOLD) ||
            (deltaX > SHAKE_THRESHOLD && deltaZ > SHAKE_THRESHOLD) ||
            (deltaY > SHAKE_THRESHOLD && deltaZ > SHAKE_THRESHOLD);

          if (isSignificantChange) {
            triggerShakeFlow();
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
        lastUpdate = currentTime;
      }
    };

    window.addEventListener("devicemotion", handleMotionEvent);
    return () => {
      window.removeEventListener("devicemotion", handleMotionEvent);
    };
  }, [parsedMenu, currentView, isShaking, isLoadingRecommendation]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 font-mono text-sm tracking-widest animate-pulse">CHILLING THE GLASSES...</div>
      </div>
    );
  }

  // Render Splash Screen for 3 seconds initially
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Age Gate Actions
  const handleAgeGate = (approved: boolean) => {
    if (approved) {
      localStorage.setItem("spec_age_gate", "true");
      setAgeGateCompleted(true);
    } else {
      setAgeGateError(true);
    }
  };

  // Sign Out Action
  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUser(null);
        setOfflineMode(false);
        resetStateToLanding();
      } catch (err) {
        console.error("Sign out error:", err);
      }
    }
  };

  // Image Upload Capture
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCurrentView("parsing");
      setApiError(null);
      setBartenderIsm("Compressing menu photo...");
      const compressedBase64 = await compressImage(file);
      setMenuImage(compressedBase64);
      setCurrentView("image-preview");
    } catch (err) {
      console.error(err);
      setApiError("Failed to process image. Try pasting menu text instead.");
      setCurrentView("landing");
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  // Submit Menu Parsing (Text or Image)
  const submitMenuForParsing = async (isText: boolean) => {
    setCurrentView("parsing");
    setApiError(null);
    setBartenderIsm("Reading the menu... Glare is the enemy!");

    try {
      const payload = isText ? { text: menuText } : { image: menuImage };
      const res = await fetch(getApiUrl("/api/parse-menu"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to parse menu.");
      }

      const parsedData: ParsedMenu = await res.json();
      if (!parsedData.drinks || parsedData.drinks.length === 0) {
        throw new Error("No drinks identified on this menu. Try pasting instead?");
      }

      setParsedMenu(parsedData);

      // Save menu search to user account history
      if (user && !offlineMode) {
        await CloudProfileStore.saveMenuSearch(
          user.uid,
          parsedData.barName || "Menu Search",
          menuText,
          menuImage,
          parsedData.drinks
        );
        const searches = await CloudProfileStore.getMenuSearches(user.uid);
        setMenuSearches(searches);
      } else {
        ProfileStore.saveMenuSearchLocal(
          parsedData.barName || "Menu Search",
          menuText,
          menuImage,
          parsedData.drinks
        );
        setMenuSearches(ProfileStore.getMenuSearchesLocal());
      }

      setMoodStep(1);
      setCurrentView("mood-questions");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Couldn't read that menu — try the paste option?";
      setApiError(msg);
      setCurrentView("landing");
    }
  };

  // Handle Mood Selection
  const selectVibe = (selectedVibe: Vibe) => {
    setVibe(selectedVibe);
    setMoodStep(2);
  };

  const selectAdventure = async (selectedAdventure: Adventure) => {
    setAdventure(selectedAdventure);
    await getRecommendation(selectedVibeState || "winding-down", selectedAdventure);
  };

  const selectedVibeState = vibe;

  // Recommendation Engine Call
  const getRecommendation = async (
    currentVibe: Vibe,
    currentAdventure: Adventure,
    currentExclusions: string[] = []
  ) => {
    setIsLoadingRecommendation(true);
    setApiError(null);

    try {
      const userProfile = profile || ProfileStore.getProfile();
      const res = await fetch(getApiUrl("/api/recommend"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu: parsedMenu,
          vibe: currentVibe,
          adventure: currentAdventure,
          profile: userProfile,
          excludeIds: currentExclusions,
          zeroProof
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Recommendation request failed.");
      }

      const data = await res.json();
      setRecommendation(data);
      setActivePick(data.pick);
      setActiveJustification(data.justification);
      setActiveCustomization(data.customization || "");
      setCurrentView("recommendation");
    } catch (err) {
      console.error(err);
      setApiError("Failed to retrieve recommendation. Please start over.");
      setCurrentView("landing");
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // Re-roll Option
  const handleReRoll = async () => {
    if (!activePick || !recommendation) return;

    const newExclusions = [...excludeIds, activePick.id];
    setExcludeIds(newExclusions);

    if (reRollCount === 0 && recommendation.runnerUp) {
      setActivePick(recommendation.runnerUp);
      setActiveJustification(recommendation.runnerUpJustification);
      setActiveCustomization(recommendation.runnerUpCustomization || "");
      setReRollCount(1);
    } else if (reRollCount === 1) {
      setReRollCount(2);
      await getRecommendation(vibe || "winding-down", adventure || "safe", newExclusions);
    }
  };

  // Accept Recommendation
  const handleAccept = () => {
    if (!activePick) return;
    setRatingDrink(activePick);
    setCurrentView("rating");
  };

  // Rate Drink & Update Palate
  const handleRateDrink = async (ratingValue: "loved" | "fine" | "nope") => {
    if (!ratingDrink || !vibe) return;

    let updatedProfile;
    const ratingData = {
      drinkName: ratingDrink.name,
      styleFamily: ratingDrink.styleFamily,
      flavorVector: ratingDrink.flavorVector,
      rating: ratingValue,
      vibe
    };

    if (user && !offlineMode) {
      updatedProfile = await CloudProfileStore.addCloudRating(user.uid, ratingData);
    } else {
      updatedProfile = ProfileStore.addRating(ratingData);
    }

    setProfile(updatedProfile);
    setShowRatingFeedback(true);
    
    // Auto reset state back to landing
    setTimeout(() => {
      setShowRatingFeedback(false);
      resetStateToLanding();
    }, 2000);
  };

  // Toggle Favorite Status
  const handleToggleFavorite = async (drink: ParsedDrink) => {
    if (user && !offlineMode) {
      const added = await CloudProfileStore.toggleFavoriteDrink(user.uid, drink);
      setIsFavorited(added);
      const favs = await CloudProfileStore.getFavoriteDrinks(user.uid);
      setFavorites(favs);
    } else {
      const added = ProfileStore.toggleFavoriteDrinkLocal(drink);
      setIsFavorited(added);
      setFavorites(ProfileStore.getFavoriteDrinksLocal());
    }
  };

  const handleToggleHistoryFavorite = async (item: DrinkRating) => {
    const existing = favorites.find(f => f.name.toLowerCase() === item.drinkName.toLowerCase());
    let drinkToToggle: ParsedDrink;
    if (existing) {
      drinkToToggle = existing;
    } else {
      drinkToToggle = {
        id: encodeURIComponent(item.drinkName.toLowerCase()),
        name: item.drinkName,
        styleFamily: item.styleFamily,
        flavorVector: item.flavorVector,
        ingredients: [],
        baseSpirits: [],
        abvCategory: "standard",
        confidence: 1.0
      };
    }
    await handleToggleFavorite(drinkToToggle);
  };

  const resetStateToLanding = () => {
    setMenuText("");
    setMenuImage(null);
    setParsedMenu(null);
    setVibe(null);
    setAdventure(null);
    setRecommendation(null);
    setActivePick(null);
    setActiveJustification("");
    setActiveCustomization("");
    setReRollCount(0);
    setExcludeIds([]);
    setRatingDrink(null);
    setCurrentView("landing");
  };

  const handleResetPalate = async () => {
    if (confirm("Reset your palate history? This cannot be undone.")) {
      let reset;
      if (user && !offlineMode) {
        reset = await CloudProfileStore.resetCloudPalate(user.uid);
      } else {
        reset = ProfileStore.resetPalate();
      }
      setProfile(reset);
    }
  };

  // Main viewport container render
  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col bg-zinc-950 shadow-2xl relative px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-0 border-x border-zinc-900 overflow-hidden">
      
      {/* Age Gate Interstitial */}
      {!ageGateCompleted && (
        <div className="absolute inset-0 bg-zinc-950 z-50 flex flex-col justify-between px-8 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] text-center">
          <div className="flex-grow flex flex-col justify-center items-center animate-reveal">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500 flex items-center justify-center mb-6">
              <span className="text-2xl text-amber-500 font-serif">🥂</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-amber-500 font-serif mb-4">
              SPEC
            </h1>
            <p className="text-zinc-400 text-lg max-w-xs mb-8">
              Your personal cocktail sommelier. Are you of legal drinking age?
            </p>

            {ageGateError ? (
              <div className="bg-red-950/40 border border-red-900 rounded-xl p-4 text-red-200 text-sm max-w-xs mb-6">
                You must be of legal drinking age to use this application. Visit{" "}
                <a href="https://www.responsibility.org" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-amber-400">
                  Responsibility.org
                </a>
              </div>
            ) : null}

            <div className="w-full max-w-xs space-y-4">
              <button
                onClick={() => handleAgeGate(true)}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-lg transition-colors active:scale-[0.98]"
              >
                Yes, I am
              </button>
              <button
                onClick={() => handleAgeGate(false)}
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 rounded-xl transition-colors"
              >
                No, I&apos;m not
              </button>
            </div>
          </div>
          <footer className="text-xs text-zinc-400 font-medium tracking-wide">
            Drink responsibly. Must be of legal drinking age.
          </footer>
        </div>
      )}

      {/* Auth Gate Screen (shown if Firebase active, not loaded, and not offline mode) */}
      {ageGateCompleted && !authLoading && !user && !offlineMode && (
        <AuthScreen 
          onSuccess={() => setOfflineMode(false)} 
          onContinueOffline={() => setOfflineMode(true)} 
        />
      )}

      {/* Loading overlay when checking Firebase Auth state */}
      {ageGateCompleted && authLoading && (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-500 font-mono text-xs tracking-wider">PREPARING ACCOUNT...</p>
        </div>
      )}

      {/* Main app layout (shown if age gate complete and authenticated/offline mode) */}
      {ageGateCompleted && !authLoading && (user || offlineMode) && (
        <>
          {/* Header */}
          {currentView !== "parsing" && !isLoadingRecommendation && (
            <header className="flex justify-between items-center mb-8 border-b border-zinc-900 pb-4 select-none">
              <h1 className="inline-block">
                <button
                  onClick={resetStateToLanding}
                  className="text-xl font-bold text-amber-500 font-serif tracking-wide active:opacity-70 cursor-pointer"
                >
                  SPEC
                </button>
              </h1>
              <div className="flex items-center gap-4">
                {user && (
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-zinc-500 hover:text-zinc-400 font-semibold cursor-pointer underline transition-colors"
                  >
                    Sign Out
                  </button>
                )}
                {!user && isFirebaseEnabled() && (
                  <button
                    onClick={() => {
                      setOfflineMode(false);
                      setCurrentView("landing");
                    }}
                    className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </header>
          )}

          {/* Main View Area */}
          <main className="flex-grow flex flex-col justify-center min-h-0 overflow-y-auto pb-4">
            
            {/* Error Notice */}
            {apiError && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900 text-red-200 text-sm text-center">
                {apiError}
              </div>
            )}

            {/* 1. Landing Screen */}
            {currentView === "landing" && (
              <div className="flex flex-col justify-between flex-grow animate-reveal">
                <div className="flex-grow flex flex-col justify-center items-center text-center py-6">
                  <div className="mb-6">
                    <MartiniIcon className="w-16 h-16 text-amber-500" />
                  </div>
                  <h2 className="text-4xl font-extrabold font-serif mb-2 tracking-tight">
                    Decide in Seconds
                  </h2>
                  <p className="text-zinc-400 text-base max-w-xs mb-10 leading-relaxed">
                    Photograph any cocktail menu and get exactly one recommendation tailored to your mood.
                  </p>

                  <div className="w-full space-y-4">
                    <button
                      onClick={triggerCamera}
                      className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-lg tracking-wide shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                    >
                      <CameraIcon className="w-6 h-6 text-zinc-950" /> Scan the Menu
                    </button>
                    
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      className="absolute opacity-0 pointer-events-none w-px h-px -z-10"
                      aria-label="Upload menu photo"
                    />

                    <button
                      onClick={() => setCurrentView("paste-menu")}
                      className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-2xl text-base transition-colors cursor-pointer"
                    >
                      Paste Menu Text Instead
                    </button>
                  </div>

                  <div className="mt-8 text-zinc-400 text-xs flex items-start gap-2.5 max-w-xs text-left">
                    <LightBulbIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>Get the whole menu in frame — glare is the enemy.</div>
                  </div>
                </div>

                {profile && profile.history.length > 0 && (
                  <div className="mt-6 border-t border-zinc-900 pt-6 select-none">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 font-mono">Recent favorites</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {profile.history.filter(h => h.rating === "loved").slice(-3).map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveHistoryDrink(item)}
                          className="flex-shrink-0 glass-card px-3.5 py-2 rounded-xl text-xs text-left cursor-pointer hover:bg-zinc-800/60 transition-colors"
                        >
                          <div className="font-semibold text-zinc-300">{item.drinkName}</div>
                          <div className="text-zinc-400 font-mono capitalize text-[10px] mt-0.5">{item.styleFamily}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtle Legal Disclaimer */}
                <div className="text-center text-[10px] text-zinc-500 font-medium tracking-wide mt-8 select-none">
                  Drink responsibly. Must be of legal drinking age.
                </div>
              </div>
            )}

            {/* 2. Paste Menu Screen */}
            {currentView === "paste-menu" && (
              <div className="flex flex-col flex-grow animate-reveal">
                <h2 className="text-2xl font-bold mb-4 font-serif text-amber-500">Paste Menu Text</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Paste the cocktails listed on the menu. Include descriptions if you have them.
                </p>

                <textarea
                  value={menuText}
                  onChange={(e) => setMenuText(e.target.value)}
                  placeholder="Example:&#10;Old Fashioned - Bourbon, Angostura, Sugar $14&#10;Paper Plane - Bourbon, Aperol, Amaro, Lemon $15"
                  className="flex-grow w-full min-h-[200px] p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-amber-500 text-base font-mono leading-relaxed mb-6"
                />

                <button
                  onClick={() => submitMenuForParsing(true)}
                  disabled={!menuText.trim()}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-2xl text-base transition-colors cursor-pointer"
                >
                  Analyze Menu
                </button>
              </div>
            )}

            {/* 3. Image Preview Screen */}
            {currentView === "image-preview" && menuImage && (
              <div className="flex flex-col flex-grow items-center justify-center text-center animate-reveal">
                <h2 className="text-2xl font-bold mb-2 font-serif text-amber-500">Confirm Photo</h2>
                <p className="text-zinc-400 text-sm mb-6 max-w-xs">
                  Make sure the drink names are readable. Clear and straight shots work best.
                </p>

                <div className="relative w-full max-h-[300px] rounded-2xl border border-zinc-800 overflow-hidden mb-8 bg-zinc-900 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={menuImage} alt="Menu preview" className="object-contain max-h-[300px]" />
                </div>

                <div className="w-full space-y-4">
                  <button
                    onClick={() => submitMenuForParsing(false)}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-base transition-colors cursor-pointer"
                  >
                    Use This Photo
                  </button>
                  <button
                    onClick={triggerCamera}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
                  >
                    Retake
                  </button>
                </div>
              </div>
            )}

            {/* 4. Parsing / Loading State */}
            {(currentView === "parsing" || isLoadingRecommendation) && (
              <div className="flex flex-col items-center justify-center py-6 text-center select-none animate-reveal">
                
                {/* Scanner Frame */}
                <div className="relative w-full max-w-[280px] h-[200px] rounded-3xl overflow-hidden glass-card mb-8 flex items-center justify-center shadow-lg">
                  {/* Glowing Laser line */}
                  <div className="laser-line" />

                  {/* Menu Image Preview or Digital Placeholder */}
                  {menuImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={menuImage}
                      alt="Scanning menu"
                      className="object-cover w-full h-full opacity-60 scale-105"
                    />
                  ) : (
                    // Digital terminal grid placeholder for paste flow
                    <div className="absolute inset-0 bg-zinc-950/40 flex flex-col items-center justify-center p-4">
                      <div className="w-10 h-10 border border-dashed border-amber-500/20 rounded-full flex items-center justify-center mb-3 text-amber-500/30 animate-pulse">
                        📝
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                        Scanning pasted text...
                      </span>
                    </div>
                  )}

                  {/* Tech Grid Overlay effect */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.06),rgba(0,0,0,0))]" />
                </div>

                <div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin mb-6"></div>
                
                <h3 className="text-xl font-serif text-amber-500 font-semibold mb-4 max-w-xs leading-relaxed px-4">
                  {bartenderIsm}
                </h3>

                {/* Progress & Console logs */}
                <div className="w-72 max-w-xs flex flex-col gap-3 items-center px-4">
                  <div className="w-full bg-zinc-900/60 border border-zinc-850 h-2 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-amber-600 to-amber-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  
                  {/* Scrolling Console Log */}
                  <div className="w-full glass-card py-2 px-3.5 rounded-xl text-left font-mono text-[9px] text-zinc-400 min-h-[48px] flex flex-col justify-center gap-1 border-zinc-850/60">
                    <div className="text-amber-500/80 font-bold uppercase tracking-wider flex justify-between">
                      <span>Status Terminal</span>
                      <span className="animate-pulse">● Live</span>
                    </div>
                    <div className="truncate text-zinc-350">
                      &gt; {getDiagnosticLog(loadingProgress)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Mood Questions Screen */}
            {currentView === "mood-questions" && !isLoadingRecommendation && (
              <div className="flex flex-col flex-grow justify-between animate-reveal select-none">
                <div>
                  <div className="flex justify-between items-center text-xs text-zinc-400 uppercase tracking-widest mb-6 font-mono font-bold">
                    <span>Vibe Check</span>
                    <span>Step {moodStep} of 2</span>
                  </div>

                  {/* Step 1: Vibe */}
                  {moodStep === 1 && (
                    <div>
                      <h2 className="text-3xl font-bold mb-6 font-serif tracking-tight">
                        What&apos;s the vibe tonight?
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => selectVibe("winding-down")}
                          className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <div className="text-3xl mb-3">🌅</div>
                          <div className="font-bold text-zinc-200">Winding Down</div>
                          <div className="text-xs text-zinc-400 mt-1">Light & relaxing</div>
                        </button>
                        <button
                          onClick={() => selectVibe("celebrating")}
                          className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <div className="text-3xl mb-3">🎉</div>
                          <div className="font-bold text-zinc-200">Celebrating</div>
                          <div className="text-xs text-zinc-400 mt-1">Sweet & fun</div>
                        </button>
                        <button
                          onClick={() => selectVibe("date-night")}
                          className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <div className="text-3xl mb-3">🕯️</div>
                          <div className="font-bold text-zinc-200">Date Night</div>
                          <div className="text-xs text-zinc-400 mt-1">Complex & elegant</div>
                        </button>
                        <button
                          onClick={() => selectVibe("one-and-done")}
                          className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <div className="text-3xl mb-3">🥃</div>
                          <div className="font-bold text-zinc-200">One & Done</div>
                          <div className="text-xs text-zinc-400 mt-1">Flavorful & strong</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Adventure */}
                  {moodStep === 2 && (
                    <div className="animate-reveal">
                      <h2 className="text-3xl font-bold mb-6 font-serif tracking-tight">
                        How adventurous?
                      </h2>
                      <div className="space-y-4">
                        <button
                          onClick={() => selectAdventure("safe")}
                          className="w-full p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] flex items-center gap-4 cursor-pointer"
                        >
                          <div className="text-2xl">🛡️</div>
                          <div>
                            <div className="font-bold text-zinc-200">Play it safe</div>
                            <div className="text-xs text-zinc-400">Go with what matches your profile</div>
                          </div>
                        </button>
                        <button
                          onClick={() => selectAdventure("surprise")}
                          className="w-full p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] flex items-center gap-4 cursor-pointer"
                        >
                          <div className="text-2xl">🎲</div>
                          <div>
                            <div className="font-bold text-zinc-200">Surprise me</div>
                            <div className="text-xs text-zinc-400">Inject some randomness into the math</div>
                          </div>
                        </button>
                        <button
                          onClick={() => selectAdventure("new-territory")}
                          className="w-full p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] flex items-center gap-4 cursor-pointer"
                        >
                          <div className="text-2xl">🚀</div>
                          <div>
                            <div className="font-bold text-zinc-200">Send me somewhere new</div>
                            <div className="text-xs text-zinc-400">Prioritize style families you haven&apos;t tried</div>
                          </div>
                        </button>
                      </div>

                      <button
                        onClick={() => setMoodStep(1)}
                        className="mt-6 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        ← Back to Vibe
                      </button>
                    </div>
                  )}
                </div>

                {/* Shake Permission Prompt */}
                {shakePermission !== true && (
                  <button
                    onClick={requestShakePermission}
                    className="w-full mt-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <ShakeIcon className="w-4 h-4 text-amber-500 shrink-0" /> Enable Shake-to-Somm
                  </button>
                )}
                {shakePermission === true && (
                  <div className="w-full mt-4 py-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl text-[10px] font-semibold tracking-wider uppercase text-zinc-400 flex items-center justify-center gap-2.5 select-none animate-pulse">
                    <ShakeIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Shake phone for a surprise choice!
                  </div>
                )}

                {/* Zero-proof Toggle */}
                <div className="border-t border-zinc-900 pt-6 mt-6 flex justify-between items-center">
                  <label htmlFor="zero-proof-toggle" className="text-sm font-bold text-zinc-400">
                    Keep it zero-proof
                  </label>
                  <button
                    id="zero-proof-toggle"
                    onClick={() => setZeroProof(!zeroProof)}
                    aria-checked={zeroProof}
                    role="switch"
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-250 focus:outline-none cursor-pointer ${
                      zeroProof ? "bg-amber-500" : "bg-zinc-800"
                    }`}
                  >
                    <div
                      className={`bg-zinc-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-250 ${
                        zeroProof ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 6. The Pick Recommendation Screen */}
            {currentView === "recommendation" && !isLoadingRecommendation && (
              <div className="flex flex-col flex-grow justify-between animate-reveal">
                {activePick ? (
                  <div className="space-y-6">
                    <div className="text-center select-none">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                        Here is your drink
                      </span>
                    </div>

                    <div className="glass-card glow-accent rounded-3xl p-6 relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex-grow pr-2">
                          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-mono font-bold capitalize inline-block mb-3">
                            {activePick.styleFamily}
                          </span>
                          <div className="flex items-start gap-1 pr-2">
                            <h2 className="text-2xl font-extrabold font-serif tracking-tight text-zinc-100 leading-tight">
                              {activePick.name}
                            </h2>
                            <button
                              onClick={() => handleToggleFavorite(activePick)}
                              className="text-2xl text-amber-500 p-1 hover:scale-110 active:scale-95 transition-all focus:outline-none cursor-pointer leading-none mt-0.5"
                              aria-label={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              {isFavorited ? "★" : "☆"}
                            </button>
                          </div>
                          {activePick.price && (
                            <div className="text-amber-500 font-mono font-bold text-base mt-2">
                              {activePick.price}
                            </div>
                          )}
                        </div>
                        <CocktailVisualizer
                          styleFamily={activePick.styleFamily}
                          name={activePick.name}
                          className="shrink-0"
                        />
                      </div>

                      {/* Justification Box */}
                      <blockquote className="bg-zinc-950/60 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-6">
                        <p className="text-zinc-200 text-sm font-medium leading-relaxed italic">
                          &ldquo;{activeJustification}&rdquo;
                        </p>
                      </blockquote>

                      {/* Bartender Tweak Secret */}
                      {activeCustomization && (
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 mb-6 flex items-start gap-3 select-none">
                          <KeyIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-bold text-amber-500 block uppercase tracking-wider font-mono mb-1 text-[10px]">
                              Bartender&apos;s Secret Tweak
                            </span>
                            <span className="text-zinc-200 font-medium leading-relaxed italic">
                              &ldquo;{activeCustomization}&rdquo;
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Ingredients */}
                      <div className="mb-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">
                          Ingredients
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {activePick.ingredients.map((ing, idx) => (
                            <span key={idx} className="bg-zinc-950/50 text-zinc-300 border border-zinc-850/60 px-2.5 py-1 rounded-lg text-xs">
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Actions */}
                    <div className="space-y-3 select-none">
                      <button
                        onClick={handleAccept}
                        className="w-full py-4.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-lg tracking-wide transition-colors active:scale-[0.98] cursor-pointer"
                      >
                        🥂 Pour It
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleReRoll}
                          disabled={reRollCount >= 2}
                          className="py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-zinc-300 font-semibold rounded-2xl text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          🔄 Not feeling it ({2 - reRollCount} left)
                        </button>
                        <button
                          onClick={resetStateToLanding}
                          className="py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
                        >
                          ↩ Start Over
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Zero-Proof Empty State
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🍋</div>
                    <h3 className="text-2xl font-bold font-serif mb-3 text-amber-500">
                      No Zero-Proof Drinks Found
                    </h3>
                    <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                      This menu doesn&apos;t seem to list any non-alcoholic options. Ask the bartender to whip up a bespoke mocktail:
                    </p>

                    <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-2xl max-w-xs mx-auto mb-8 text-left text-sm text-zinc-300">
                      Ask for a <strong className="text-amber-500 font-serif">Ginger Mint Smash</strong>:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400 text-xs">
                        <li>Ginger beer for carbonation and spice</li>
                        <li>Muddled fresh mint and lime</li>
                        <li>A splash of club soda & simple syrup</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => { setZeroProof(false); setMoodStep(1); setCurrentView("mood-questions"); }}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-base transition-colors cursor-pointer"
                      >
                        Try Regular Menu
                      </button>
                      <button
                        onClick={resetStateToLanding}
                        className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. Rating / Feedback Screen */}
            {currentView === "rating" && ratingDrink && (
              <div className="flex flex-col flex-grow justify-center select-none">
                {showRatingFeedback ? (
                  <div className="text-center py-12 animate-reveal">
                    <div className="flex justify-center mb-6 animate-bounce">
                      <CheckIcon className="w-16 h-16 text-amber-500" />
                    </div>
                    <h3 className="text-3xl font-serif text-amber-500 font-bold mb-3">Palate Calibrated!</h3>
                    <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                      Spec is logging this drink to adjust your future recommendations.
                    </p>
                  </div>
                ) : (
                  <div className="animate-reveal text-center">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">How was it?</span>
                    <h2 className="text-3xl font-bold font-serif text-amber-500 mt-2 mb-6">
                      {ratingDrink.name}
                    </h2>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => handleRateDrink("loved")}
                        className="w-full py-4 glass-card hover:border-green-500/40 text-zinc-200 font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <HeartIcon className="w-5 h-5 text-green-500 shrink-0" filled={true} /> Loved it!
                      </button>
                      <button
                        onClick={() => handleRateDrink("fine")}
                        className="w-full py-4 glass-card hover:border-amber-500/40 text-zinc-200 font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <MehIcon className="w-5 h-5 text-amber-500 shrink-0" filled={true} /> It was fine
                      </button>
                      <button
                        onClick={() => handleRateDrink("nope")}
                        className="w-full py-4 glass-card hover:border-red-500/40 text-zinc-200 font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <ThumbsDownIcon className="w-5 h-5 text-red-500 shrink-0" filled={true} /> Not for me
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8. Palate & Profile Screen */}
            {currentView === "palate" && profile && (
              <div className="flex flex-col flex-grow animate-reveal select-none">
                <h2 className="text-2xl font-bold font-serif mb-4 text-amber-500">Your Palate</h2>

                {/* Radar Chart */}
                <div className="glass-card rounded-3xl p-4 mb-6">
                  <PalateChart affinities={profile.affinities} />
                  
                  <div className="flex justify-around items-center border-t border-zinc-850 pt-4 mt-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-500 font-mono">
                        {profile.stylesTried.length}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
                        Styles Tried
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-500 font-mono">
                        {profile.ratingsCount}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
                        Drinks Rated
                      </div>
                    </div>
                  </div>
                </div>

                {/* History List */}
                <div className="flex-grow flex flex-col mb-6">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 font-mono">
                    Drink History
                  </h3>

                  {profile.history.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center p-6 border border-dashed border-zinc-850 rounded-2xl text-zinc-400 text-sm">
                      No drinks rated yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profile.history.slice().reverse().map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-bold text-zinc-300">{item.drinkName}</div>
                            <div className="text-zinc-400 font-mono capitalize">
                              {item.styleFamily} &bull; {item.vibe.replace("-", " ")}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center">
                              {item.rating === "loved" && <HeartIcon className="w-4 h-4 text-green-500" filled={true} />}
                              {item.rating === "fine" && <MehIcon className="w-4 h-4 text-amber-500" filled={true} />}
                              {item.rating === "nope" && <ThumbsDownIcon className="w-4 h-4 text-red-500" filled={true} />}
                            </span>
                            <span className="text-zinc-400 font-mono">
                              {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => setCurrentView("landing")}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-base transition-colors cursor-pointer"
                  >
                    Back to Scanner
                  </button>
                  <button
                    onClick={handleResetPalate}
                    className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-red-900/40 text-red-400 font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
                  >
                    Reset My Palate
                  </button>

                  {/* Subtle Legal Disclaimer */}
                  <div className="text-center text-[10px] text-zinc-500 font-medium tracking-wide mt-6 select-none">
                    Drink responsibly. Must be of legal drinking age.
                  </div>
                </div>
              </div>
            )}

            {/* 9. Favorites Screen */}
            {currentView === "favorites" && (
              <div className="flex flex-col flex-grow animate-reveal">
                <h2 className="text-2xl font-bold font-serif mb-4 text-amber-500">Favorite Drinks</h2>
                {favorites.length === 0 ? (
                  <div className="flex-grow flex flex-col justify-center items-center text-center p-6 border border-dashed border-zinc-800 glass-card rounded-3xl text-zinc-400 my-4 select-none">
                    <span className="text-5xl mb-4">⭐</span>
                    <h3 className="text-lg font-bold font-serif text-zinc-300 mb-2">No Favorites Yet</h3>
                    <p className="text-zinc-400 text-xs max-w-[240px] leading-relaxed mb-6">
                      Scan a menu and star your preferred drinks to save them here!
                    </p>
                    <button
                      onClick={() => setCurrentView("landing")}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                    >
                      Go to Scanner
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pb-8 pr-1">
                    {favorites.map((drink, idx) => (
                      <div key={idx} className="glass-card p-5 rounded-2xl relative">
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize">
                            {drink.styleFamily}
                          </span>
                          <button
                            onClick={() => handleToggleFavorite(drink)}
                            className="text-amber-500 text-xl hover:scale-110 active:scale-95 transition-all focus:outline-none cursor-pointer"
                            aria-label="Remove from favorites"
                          >
                            ★
                          </button>
                        </div>
                        <h3 className="text-lg font-bold font-serif text-zinc-100 pr-24 mb-1">{drink.name}</h3>
                        {drink.price && <div className="text-amber-500 font-mono text-xs mb-3 font-semibold">{drink.price}</div>}
                        {drink.description && <p className="text-zinc-400 text-xs mb-3 leading-relaxed">{drink.description}</p>}
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">Ingredients</h4>
                          <div className="flex flex-wrap gap-1">
                            {drink.ingredients.map((ing, iIdx) => (
                              <span key={iIdx} className="bg-zinc-950 text-zinc-400 border border-zinc-850 px-2 py-0.5 rounded-md text-[10px]">
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 10. Scanned Menus History Screen */}
            {currentView === "history" && (
              <div className="flex flex-col flex-grow animate-reveal">
                <h2 className="text-2xl font-bold font-serif mb-4 text-amber-500">Scanned Menus</h2>
                {menuSearches.length === 0 ? (
                  <div className="flex-grow flex flex-col justify-center items-center text-center p-6 border border-dashed border-zinc-800 glass-card rounded-3xl text-zinc-400 my-4 select-none">
                    <span className="text-5xl mb-4">📜</span>
                    <h3 className="text-lg font-bold font-serif text-zinc-300 mb-2">No Saved Menus</h3>
                    <p className="text-zinc-400 text-xs max-w-[240px] leading-relaxed mb-6">
                      Scan or paste menus and they will be saved here so you can re-open them later.
                    </p>
                    <button
                      onClick={() => setCurrentView("landing")}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                    >
                      Go to Scanner
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pb-8 pr-1">
                    {menuSearches.map((search, idx) => (
                      <div key={idx} className="glass-card p-4 rounded-2xl flex justify-between items-center">
                        <div className="pr-4">
                          <h3 className="text-sm font-bold font-serif text-zinc-200 mb-0.5">{search.barName}</h3>
                          <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-1">
                            {new Date(search.timestamp).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                          <div className="text-amber-500/80 text-[10px] font-semibold font-mono font-bold">
                            {search.drinks?.length || 0} drinks parsed
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setParsedMenu({
                              drinks: search.drinks,
                              barName: search.barName,
                              warnings: []
                            });
                            setVibe(null);
                            setAdventure(null);
                            setMoodStep(1);
                            setCurrentView("mood-questions");
                          }}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
                        >
                          Re-open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </main>

          {/* Bottom Navigation Bar */}
          {currentView !== "parsing" && !isLoadingRecommendation && (
            <nav className="w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900 py-3 flex justify-center gap-10 items-center z-40 select-none mt-auto -mx-6 px-6 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
              <button
                onClick={() => {
                  resetStateToLanding();
                }}
                className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  ["landing", "paste-menu", "image-preview", "mood-questions", "recommendation", "rating"].includes(currentView)
                    ? "text-amber-500 scale-105 font-bold"
                    : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                <CameraIcon className="w-5.5 h-5.5" />
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Sommelier</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView("palate");
                }}
                className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  currentView === "palate"
                    ? "text-amber-500 scale-105 font-bold"
                    : "text-zinc-500 hover:text-zinc-355"
                }`}
              >
                <ChartIcon className="w-5.5 h-5.5" />
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Palate</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView("favorites");
                }}
                className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  currentView === "favorites"
                    ? "text-amber-500 scale-105 font-bold"
                    : "text-zinc-500 hover:text-zinc-355"
                }`}
              >
                <StarIcon className="w-5.5 h-5.5" filled={currentView === "favorites"} />
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Favorites</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView("history");
                }}
                className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  currentView === "history"
                    ? "text-amber-500 scale-105 font-bold"
                    : "text-zinc-500 hover:text-zinc-355"
                }`}
              >
                <HistoryIcon className="w-5.5 h-5.5" />
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider">History</span>
              </button>
            </nav>
          )}
        </>
      )}

      {/* History Drink Modal */}
      {activeHistoryDrink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none animate-reveal">
          <div className="glass-card rounded-3xl p-6 max-w-sm w-full relative shadow-2xl">
            <button
              onClick={() => setActiveHistoryDrink(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 text-lg p-2 leading-none focus:outline-none cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="flex justify-between items-center mb-6 pr-4">
              <div className="flex-grow pr-2">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">
                  Drink Profile
                </span>
                <div className="flex items-start gap-1 mt-1 pr-2">
                  <h3 className="text-xl font-extrabold font-serif text-zinc-100 leading-tight">
                    {activeHistoryDrink.drinkName}
                  </h3>
                  <button
                    onClick={() => handleToggleHistoryFavorite(activeHistoryDrink)}
                    className="text-2xl text-amber-500 p-1 hover:scale-110 active:scale-95 transition-all focus:outline-none cursor-pointer leading-none shrink-0"
                    aria-label={favorites.some(f => f.name.toLowerCase() === activeHistoryDrink.drinkName.toLowerCase()) ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    {favorites.some(f => f.name.toLowerCase() === activeHistoryDrink.drinkName.toLowerCase()) ? "★" : "☆"}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize">
                    {activeHistoryDrink.styleFamily}
                  </span>
                  <span className="text-zinc-400 text-[9px] font-mono font-semibold uppercase tracking-wider">
                    Tried on {activeHistoryDrink.vibe.replace("-", " ")}
                  </span>
                </div>
              </div>
              <CocktailVisualizer
                styleFamily={activeHistoryDrink.styleFamily}
                name={activeHistoryDrink.drinkName}
                className="shrink-0"
              />
            </div>

            {/* Flavor Vector Breakdown */}
            <div className="space-y-3 mb-6">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono mb-2">
                Flavor Characteristics
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {Object.entries(activeHistoryDrink.flavorVector)
                  .filter(([, val]) => val > 0)
                  .sort(([, valA], [, valB]) => valB - valA)
                  .slice(0, 4)
                  .map(([key, val]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                        <span className="capitalize">{key}</span>
                        <span className="text-amber-500 font-mono">{val}/10</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${val * 10}%` }} 
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={() => setActiveHistoryDrink(null)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Shaker Overlay */}
      {isShaking && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex flex-col justify-center items-center select-none animate-reveal">
          <div className="animate-shaker mb-8">
            <svg width="100" height="120" viewBox="0 0 100 120" className="drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
              {/* Cap */}
              <path d="M 40 10 Q 50 2 60 10 L 58 24 L 42 24 Z" fill="#e4e4e7" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
              {/* Strainer section */}
              <path d="M 33 25 L 67 25 C 67 25, 63 45, 60 45 L 40 45 C 37 45, 33 25, 33 25 Z" fill="#d4d4d8" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
              {/* Main shaker cup */}
              <path d="M 36 46 L 64 46 L 54 110 L 46 110 Z" fill="#a1a1aa" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
              {/* Metal gloss reflection */}
              <path d="M 48 10 Q 50 8 52 10 L 52 110 L 48 110 Z" fill="#ffffff" opacity="0.2" />
            </svg>
          </div>
          <h3 className="text-2xl font-serif text-amber-500 font-bold mb-2 animate-pulse">
            Mixing It Up...
          </h3>
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-[0.2em]">
            Shaking the cocktails
          </p>
        </div>
      )}

    </div>
  );
}
