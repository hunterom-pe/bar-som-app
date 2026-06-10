"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Show splash for 2.6 seconds, then start the fade out animation (0.4s)
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2600);

    // Call onComplete after exactly 3.0 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ease-out select-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center max-w-xs text-center px-6 animate-[reveal_1.2s_ease-out]">
        {/* Logo Icon */}
        <div className="relative w-28 h-28 mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center shadow-2xl animate-[pulse-slow_3s_infinite_ease-in-out]">
          <Image
            src="/logo.png"
            alt="Spec Logo"
            width={112}
            height={112}
            className="object-cover"
            priority
          />
        </div>

        {/* App Title */}
        <h1 className="text-4xl font-bold font-serif text-amber-500 tracking-wider mb-2 drop-shadow-md">
          Spec
        </h1>

        {/* Tagline */}
        <p className="text-zinc-400 text-xs font-sans font-semibold uppercase tracking-[0.2em] leading-relaxed max-w-[240px]">
          Your Personal Cocktail Sommelier
        </p>

        {/* Tiny subtle loading dot indicator */}
        <div className="flex gap-1.5 mt-8 justify-center items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 animate-[bounce_1.4s_infinite_100ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 animate-[bounce_1.4s_infinite_300ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 animate-[bounce_1.4s_infinite_500ms]" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
