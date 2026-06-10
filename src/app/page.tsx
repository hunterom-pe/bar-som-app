"use client";

import React, { useState, useEffect, useRef } from "react";
import { ParsedDrink, ParsedMenu, TasteProfile, Vibe, Adventure } from "@/lib/types";
import { ProfileStore } from "@/lib/profile-store";
import { PalateChart } from "@/components/PalateChart";
import { compressImage } from "@/lib/image";

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
  if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://bar-som-app.netlify.app";
    return `${baseUrl}${path}`;
  }
  return path;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  // State
  const [ageGateCompleted, setAgeGateCompleted] = useState<boolean | null>(null);
  const [ageGateError, setAgeGateError] = useState(false);
  
  const [currentView, setCurrentView] = useState<
    "landing" | "paste-menu" | "image-preview" | "parsing" | "mood-questions" | "recommendation" | "rating" | "palate"
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
    runnerUp: ParsedDrink | null;
    runnerUpJustification: string;
  } | null>(null);
  
  const [activePick, setActivePick] = useState<ParsedDrink | null>(null);
  const [activeJustification, setActiveJustification] = useState("");
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

  // Mount check and initial state load
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      // Load age gate
      const gate = localStorage.getItem("bar_sommelier_age_gate");
      setAgeGateCompleted(gate === "true");
      // Load profile
      setProfile(ProfileStore.getProfile());
    }, 0);

    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }

    return () => clearTimeout(timer);
  }, []);

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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 font-mono text-sm tracking-widest">CHILLING THE GLASSES...</div>
      </div>
    );
  }

  // Age Gate actions
  const handleAgeGate = (approved: boolean) => {
    if (approved) {
      localStorage.setItem("bar_sommelier_age_gate", "true");
      setAgeGateCompleted(true);
    } else {
      setAgeGateError(true);
    }
  };

  // Image upload capture
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

  // Submit Menu parsing (Text or Image)
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
        throw new Error("No cocktails identified on this menu. Try pasting instead?");
      }

      setParsedMenu(parsedData);
      setMoodStep(1);
      setCurrentView("mood-questions");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Couldn't read that menu — try the paste option?";
      setApiError(msg);
      setCurrentView("landing");
    }
  };

  // Handle Mood Tap
  const selectVibe = (selectedVibe: Vibe) => {
    setVibe(selectedVibe);
    setMoodStep(2); // Auto-advance to Adventure question
  };

  const selectAdventure = async (selectedAdventure: Adventure) => {
    setAdventure(selectedAdventure);
    await getRecommendation(selectedVibeState || "winding-down", selectedAdventure);
  };

  // Keep a local reference to vibe state to bypass state setter latency
  const selectedVibeState = vibe;

  // Recommendation flow
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
      setCurrentView("recommendation");
    } catch (err) {
      console.error(err);
      setApiError("Failed to retrieve recommendation. Please start over.");
      setCurrentView("landing");
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // Re-roll (Not feeling it)
  const handleReRoll = async () => {
    if (!activePick || !recommendation) return;

    const newExclusions = [...excludeIds, activePick.id];
    setExcludeIds(newExclusions);

    if (reRollCount === 0 && recommendation.runnerUp) {
      // Instant first re-roll: Swap to local runner-up
      setActivePick(recommendation.runnerUp);
      setActiveJustification(recommendation.runnerUpJustification);
      setReRollCount(1);
    } else if (reRollCount === 1) {
      // Second re-roll: Query API with both exclusions
      setReRollCount(2);
      await getRecommendation(vibe || "winding-down", adventure || "safe", newExclusions);
    }
  };

  // Accept recommendation
  const handleAccept = () => {
    if (!activePick) return;
    setRatingDrink(activePick);
    setCurrentView("rating");
  };

  // Rate drink
  const handleRateDrink = (ratingValue: "loved" | "fine" | "nope") => {
    if (!ratingDrink || !vibe) return;

    const updatedProfile = ProfileStore.addRating({
      drinkName: ratingDrink.name,
      styleFamily: ratingDrink.styleFamily,
      flavorVector: ratingDrink.flavorVector,
      rating: ratingValue,
      vibe
    });

    setProfile(updatedProfile);
    setShowRatingFeedback(true);
    
    // Auto reset state for landing
    setTimeout(() => {
      setShowRatingFeedback(false);
      resetStateToLanding();
    }, 2000);
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
    setReRollCount(0);
    setExcludeIds([]);
    setRatingDrink(null);
    setCurrentView("landing");
  };

  const handleResetPalate = () => {
    if (confirm("Reset your palate history? This cannot be undone.")) {
      const reset = ProfileStore.resetPalate();
      setProfile(reset);
    }
  };

  // Renders the mobile viewport container
  return (
    <div className="w-full max-w-md mx-auto flex-grow flex flex-col bg-zinc-950 shadow-2xl relative min-h-screen px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] border-x border-zinc-900">
      
      {/* Age Gate Interstitial */}
      {!ageGateCompleted && (
        <div className="absolute inset-0 bg-zinc-950 z-50 flex flex-col justify-between px-8 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] text-center">
          <div className="flex-grow flex flex-col justify-center items-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500 flex items-center justify-center mb-6">
              <span className="text-2xl text-amber-500 font-serif">🥂</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-amber-500 font-serif mb-4">
              BAR SOMMELIER
            </h1>
            <p className="text-zinc-400 text-lg max-w-xs mb-8">
              A personal mixology concierge. Are you of legal drinking age?
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

      {/* Header (hidden in loaders & age gate) */}
      {currentView !== "parsing" && !isLoadingRecommendation && (
        <header className="flex justify-between items-center mb-8 border-b border-zinc-900 pb-4">
          <h1 className="inline-block">
            <button
              onClick={resetStateToLanding}
              className="text-xl font-bold text-amber-500 font-serif tracking-wide active:opacity-70 cursor-pointer"
            >
              BAR SOMMELIER
            </button>
          </h1>
          {currentView === "landing" && (
            <button
              onClick={() => setCurrentView("palate")}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-500 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              Palate
            </button>
          )}
          {currentView !== "landing" && (
            <button
              onClick={resetStateToLanding}
              className="text-zinc-400 hover:text-zinc-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          )}
        </header>
      )}

      {/* Main View Area */}
      <main className="flex-grow flex flex-col justify-center">
        
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
              <div className="text-6xl mb-6">🍸</div>
              <h2 className="text-4xl font-extrabold font-serif mb-2 tracking-tight">
                Decide in Seconds
              </h2>
              <p className="text-zinc-400 text-base max-w-xs mb-10 leading-relaxed">
                Photograph any cocktail menu and get exactly one recommendation tailored to your mood.
              </p>

              <div className="w-full space-y-4">
                <button
                  onClick={triggerCamera}
                  className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-lg tracking-wide shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <span className="text-xl">📸</span> Scan the Menu
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
                  className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-2xl text-base transition-colors"
                >
                  Paste Menu Text Instead
                </button>
              </div>

              <div className="mt-8 text-zinc-400 text-xs flex items-start gap-2 max-w-[280px] text-left">
                <span className="leading-none mt-0.5">💡</span>
                <div>
                  <div>Get the whole menu in frame</div>
                  <div className="mt-0.5">— glare is the enemy.</div>
                </div>
              </div>
            </div>

            {profile && profile.history.length > 0 && (
              <div className="mt-6 border-t border-zinc-900 pt-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Recent favorites</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {profile.history.filter(h => h.rating === "loved").slice(-3).map((item, idx) => (
                    <div key={idx} className="flex-shrink-0 bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-xl text-xs">
                      <div className="font-semibold text-zinc-300">{item.drinkName}</div>
                      <div className="text-zinc-400 font-mono capitalize">{item.styleFamily}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              className="flex-grow w-full min-h-[200px] p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-amber-500 text-sm font-mono leading-relaxed mb-6"
            />

            <button
              onClick={() => submitMenuForParsing(true)}
              disabled={!menuText.trim()}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-2xl text-base transition-colors"
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
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-base transition-colors"
              >
                Use This Photo
              </button>
              <button
                onClick={triggerCamera}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 font-semibold rounded-2xl text-sm transition-colors"
              >
                Retake
              </button>
            </div>
          </div>
        )}

        {/* 4. Parsing / Loading State */}
        {(currentView === "parsing" || isLoadingRecommendation) && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {/* Spinning shaker icon */}
            <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-8"></div>
            
            <h3 className="text-2xl font-serif text-amber-500 font-semibold mb-2">
              {bartenderIsm}
            </h3>
            <p className="text-zinc-400 text-sm max-w-xs italic animate-pulse">
              This usually takes 4-6 seconds.
            </p>
          </div>
        )}

        {/* 5. Mood Questions Screen */}
        {currentView === "mood-questions" && (
          <div className="flex flex-col flex-grow justify-between animate-reveal">
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
                      className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98]"
                    >
                      <div className="text-3xl mb-3">🌅</div>
                      <div className="font-bold text-zinc-200">Winding Down</div>
                      <div className="text-xs text-zinc-400 mt-1">Light & relaxing</div>
                    </button>
                    <button
                      onClick={() => selectVibe("celebrating")}
                      className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98]"
                    >
                      <div className="text-3xl mb-3">🎉</div>
                      <div className="font-bold text-zinc-200">Celebrating</div>
                      <div className="text-xs text-zinc-400 mt-1">Sweet & fun</div>
                    </button>
                    <button
                      onClick={() => selectVibe("date-night")}
                      className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98]"
                    >
                      <div className="text-3xl mb-3">🕯️</div>
                      <div className="font-bold text-zinc-200">Date Night</div>
                      <div className="text-xs text-zinc-400 mt-1">Complex & elegant</div>
                    </button>
                    <button
                      onClick={() => selectVibe("one-and-done")}
                      className="p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98]"
                    >
                      <div className="text-3xl mb-3">🥃</div>
                      <div className="font-bold text-zinc-200">One & Done</div>
                      <div className="text-xs text-zinc-400 mt-1">Flavorful & countful</div>
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
                      className="w-full p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] flex items-center gap-4"
                    >
                      <div className="text-2xl">🛡️</div>
                      <div>
                        <div className="font-bold text-zinc-200">Play it safe</div>
                        <div className="text-xs text-zinc-400">Go with what matches your profile</div>
                      </div>
                    </button>
                    <button
                      onClick={() => selectAdventure("surprise")}
                      className="w-full p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] flex items-center gap-4"
                    >
                      <div className="text-2xl">🎲</div>
                      <div>
                        <div className="font-bold text-zinc-200">Surprise me</div>
                        <div className="text-xs text-zinc-400">Inject some randomness into the math</div>
                      </div>
                    </button>
                    <button
                      onClick={() => selectAdventure("new-territory")}
                      className="w-full p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] flex items-center gap-4"
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
                    className="mt-6 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    ← Back to Vibe
                  </button>
                </div>
              )}
            </div>

            {/* Zero-proof Toggle in Footer */}
            <div className="border-t border-zinc-900 pt-6 mt-6 flex justify-between items-center">
              <label htmlFor="zero-proof-toggle" className="text-sm font-bold text-zinc-400">
                Keep it zero-proof
              </label>
              <button
                id="zero-proof-toggle"
                onClick={() => setZeroProof(!zeroProof)}
                aria-checked={zeroProof}
                role="switch"
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-250 focus:outline-none ${
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
        {currentView === "recommendation" && (
          <div className="flex flex-col flex-grow justify-between animate-reveal">
            {activePick ? (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    Here is your drink
                  </span>
                </div>

                <div className="bg-zinc-900 border border-zinc-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-mono font-bold capitalize">
                      {activePick.styleFamily}
                    </span>
                  </div>

                  <h2 className="text-3xl font-extrabold font-serif tracking-tight text-zinc-100 pr-20 mb-2">
                    {activePick.name}
                  </h2>

                  {activePick.price && (
                    <div className="text-amber-500 font-mono font-bold text-lg mb-4">
                      {activePick.price}
                    </div>
                  )}

                  {/* Justification Box */}
                  <blockquote className="bg-zinc-950 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-6">
                    <p className="text-zinc-200 text-sm font-medium leading-relaxed italic">
                      &ldquo;{activeJustification}&rdquo;
                    </p>
                  </blockquote>

                  {/* Ingredients */}
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">
                      Ingredients
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {activePick.ingredients.map((ing, idx) => (
                        <span key={idx} className="bg-zinc-950 text-zinc-400 border border-zinc-850 px-2.5 py-1 rounded-lg text-xs">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommendation Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleAccept}
                    className="w-full py-4.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-lg tracking-wide transition-colors active:scale-[0.98]"
                  >
                    🥂 Pour It
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleReRoll}
                      disabled={reRollCount >= 2}
                      className="py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-zinc-300 font-semibold rounded-2xl text-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      🔄 Not feeling it ({2 - reRollCount} left)
                    </button>
                    <button
                      onClick={resetStateToLanding}
                      className="py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 font-semibold rounded-2xl text-sm transition-colors"
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
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-base transition-colors"
                  >
                    Turn Off Zero-Proof Filter
                  </button>
                  <button
                    onClick={resetStateToLanding}
                    className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold rounded-2xl text-sm transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. Rating Modal/Screen */}
        {currentView === "rating" && ratingDrink && (
          <div className="flex flex-col items-center justify-center text-center py-6 animate-reveal">
            
            {showRatingFeedback ? (
              <div className="space-y-4">
                <div className="text-5xl animate-bounce">👍</div>
                <h2 className="text-2xl font-bold text-amber-500 font-serif">Palate Updated!</h2>
                <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                  We&apos;ve calibrated your flavor dimension affinities based on this drink.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-xs space-y-6">
                <div className="text-4xl">🍹</div>
                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    Rate Your Drink
                  </span>
                  <h2 className="text-2xl font-extrabold text-zinc-100 font-serif mt-1">
                    How was the {ratingDrink.name}?
                  </h2>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handleRateDrink("loved")}
                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-850 hover:border-green-500/40 border border-zinc-800 text-zinc-200 font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <span className="text-lg">😍</span> Loved it!
                  </button>
                  <button
                    onClick={() => handleRateDrink("fine")}
                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-850 hover:border-amber-500/40 border border-zinc-800 text-zinc-200 font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <span className="text-lg">😐</span> It was fine
                  </button>
                  <button
                    onClick={() => handleRateDrink("nope")}
                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-850 hover:border-red-500/40 border border-zinc-800 text-zinc-200 font-bold rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <span className="text-lg">👎</span> Not for me
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. Palate & Profile Screen */}
        {currentView === "palate" && profile && (
          <div className="flex flex-col flex-grow animate-reveal">
            <h2 className="text-2xl font-bold font-serif mb-4 text-amber-500">Your Palate</h2>

            {/* Radar Chart */}
            <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-4 mb-6 shadow-md">
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
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
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
                        <span className="text-xs">
                          {item.rating === "loved" && "😍"}
                          {item.rating === "fine" && "😐"}
                          {item.rating === "nope" && "👎"}
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
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-base transition-colors"
              >
                Back to Scanner
              </button>
              <button
                onClick={handleResetPalate}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-red-900/40 text-red-400 font-semibold rounded-2xl text-sm transition-colors"
              >
                Reset My Palate
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Persistent Legal Footer */}
      {currentView !== "parsing" && !isLoadingRecommendation && (
        <footer className="mt-8 pt-4 border-t border-zinc-900 text-center text-[10px] text-zinc-400 font-medium tracking-wide">
          Drink responsibly. Must be of legal drinking age.
        </footer>
      )}

    </div>
  );
}
