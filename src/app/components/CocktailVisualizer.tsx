"use client";

import React from "react";

interface CocktailVisualizerProps {
  styleFamily: string;
  name: string;
  className?: string;
}

export default function CocktailVisualizer({ styleFamily, name, className = "" }: CocktailVisualizerProps) {
  // Determine glass shape
  const getGlassType = (): "coupe" | "highball" | "rocks" | "shot" => {
    const s = styleFamily.toLowerCase();
    const n = name.toLowerCase();
    
    if (
      s.includes("coupe") || s.includes("martini") || s.includes("daisy") || 
      n.includes("margarita") || n.includes("martini") || n.includes("gimlet") || 
      n.includes("daiquiri") || n.includes("cosmopolitan") || n.includes("sidecar") || 
      n.includes("manhattan") || n.includes("paper plane") || n.includes("aviation") ||
      n.includes("sour") // stem glass typical for sours, else rocks
    ) {
      return "coupe";
    }
    
    if (
      s.includes("highball") || s.includes("collins") || s.includes("fizz") || 
      s.includes("tonic") || s.includes("spritz") ||
      n.includes("paloma") || n.includes("mojito") || n.includes("mule") || 
      n.includes("tonic") || n.includes("spritz") || n.includes("highball") || 
      n.includes("collins") || n.includes("bloody mary")
    ) {
      return "highball";
    }
    
    if (
      s.includes("rocks") || s.includes("lowball") || s.includes("old-fashioned") || 
      s.includes("duo") || n.includes("old fashioned") || n.includes("negroni") || 
      n.includes("sazerac") || n.includes("mai tai") || n.includes("bourbon") || n.includes("whiskey")
    ) {
      return "rocks";
    }
    
    if (s.includes("shot") || n.includes("shot")) {
      return "shot";
    }
    
    // Default to elegant coupe
    return "coupe";
  };

  // Determine liquid gradient colors based on name
  const getLiquidColors = (): { start: string; end: string } => {
    const n = name.toLowerCase();
    if (n.includes("negroni") || n.includes("campari") || n.includes("aperol") || n.includes("boulevardier") || n.includes("spritz")) {
      return { start: "#dc2626", end: "#ea580c" }; // Negroni red/orange
    }
    if (n.includes("margarita") || n.includes("gimlet") || n.includes("mojito") || n.includes("lime") || n.includes("chartreuse")) {
      return { start: "#65a30d", end: "#a3e635" }; // Lime green
    }
    if (n.includes("paloma") || n.includes("cosmopolitan") || n.includes("pink") || n.includes("grapefruit") || n.includes("clover club")) {
      return { start: "#be185d", end: "#fb7185" }; // Pink/ruby grapefruit
    }
    if (n.includes("old fashioned") || n.includes("manhattan") || n.includes("sazerac") || n.includes("whiskey") || n.includes("bourbon") || n.includes("dark")) {
      return { start: "#78350f", end: "#d97706" }; // Deep amber
    }
    if (n.includes("sour") || n.includes("lemon") || n.includes("bee's") || n.includes("yellow") || n.includes("gold") || n.includes("penicillin")) {
      return { start: "#ca8a04", end: "#facc15" }; // Lemon yellow
    }
    // Default gold
    return { start: "#b45309", end: "#f59e0b" };
  };

  const glassType = getGlassType();
  const colors = getLiquidColors();
  const gradId = `liq-grad-${name.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={`relative flex items-center justify-center w-24 h-24 select-none ${className}`}>
      {/* SVG Canvas */}
      <svg width="80" height="80" viewBox="0 0 80 80" className="drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">
        <defs>
          {/* Liquid Gradient */}
          <linearGradient id={gradId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.start} stopOpacity="0.95" />
            <stop offset="100%" stopColor={colors.end} stopOpacity="0.85" />
          </linearGradient>

          {/* Glass Gloss Shine Gradient */}
          <linearGradient id="glass-shine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="15%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="85%" stopColor="#ffffff" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* 1. COUPE GLASS */}
        {glassType === "coupe" && (
          <g>
            {/* Garnish - Olive on toothpick */}
            {name.toLowerCase().includes("martini") && (
              <g>
                <line x1="28" y1="20" x2="52" y2="45" stroke="#94a3b8" strokeWidth="1.2" />
                <circle cx="38" cy="30" r="5" fill="#65a30d" />
                <circle cx="38" cy="30" r="1.5" fill="#dc2626" />
              </g>
            )}
            
            {/* Garnish - Lime Wheel on Rim */}
            {!name.toLowerCase().includes("martini") && (
              <g transform="translate(26, 17) rotate(15)">
                <circle cx="0" cy="0" r="7" fill="#84cc16" stroke="#4d7c0f" strokeWidth="1" />
                <circle cx="0" cy="0" r="5" fill="#a3e635" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="#4d7c0f" strokeWidth="0.8" />
                <line x1="-5" y1="0" x2="5" y2="0" stroke="#4d7c0f" strokeWidth="0.8" />
              </g>
            )}

            {/* Liquid inside Coupe */}
            <path
              d="M 23 32 C 23 48, 57 48, 57 32 Z"
              fill={`url(#${gradId})`}
            />

            {/* Glass Outline */}
            <path
              d="M 20 28 L 22 32 C 22 50, 58 50, 58 32 L 60 28"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />

            {/* Stem */}
            <line x1="40" y1="48" x2="40" y2="68" stroke="#ffffff" strokeWidth="2.2" strokeOpacity="0.6" />
            
            {/* Base */}
            <path
              d="M 30 68 C 30 68, 40 67, 50 68"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
          </g>
        )}

        {/* 2. HIGHBALL GLASS */}
        {glassType === "highball" && (
          <g>
            {/* Garnish - Straw */}
            <line x1="48" y1="14" x2="36" y2="60" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Garnish - Lemon slice on rim */}
            <g transform="translate(52, 22) rotate(-30)">
              <path d="M 0 0 Q -5 -8, 5 -12 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="0.8" />
            </g>

            {/* Liquid */}
            <rect
              x="29"
              y="30"
              width="22"
              height="38"
              rx="1"
              fill={`url(#${gradId})`}
            />

            {/* Ice Cubes */}
            <g opacity="0.3">
              <rect x="33" y="52" width="10" height="10" rx="1.5" fill="#ffffff" transform="rotate(5 33 52)" />
              <rect x="36" y="36" width="10" height="10" rx="1.5" fill="#ffffff" transform="rotate(-8 36 36)" />
            </g>

            {/* Bubbles (simulated) */}
            <g fill="#ffffff" opacity="0.5" className="animate-[pulse_1.5s_infinite]">
              <circle cx="33" cy="48" r="0.8" />
              <circle cx="47" cy="42" r="0.8" />
              <circle cx="38" cy="34" r="1" />
              <circle cx="43" cy="55" r="0.6" />
            </g>

            {/* Glass Outline */}
            <path
              d="M 27 22 L 28 69 C 28 70, 52 70, 52 69 L 53 22"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />

            {/* Glass Shine */}
            <rect
              x="28"
              y="22"
              width="24"
              height="46"
              fill="url(#glass-shine)"
              opacity="0.5"
              pointerEvents="none"
            />
          </g>
        )}

        {/* 3. ROCKS GLASS */}
        {glassType === "rocks" && (
          <g>
            {/* Garnish - Orange twist on rim */}
            <path
              d="M 24 32 Q 21 28, 25 24 Q 29 20, 26 15"
              fill="none"
              stroke="#ea580c"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Liquid */}
            <rect
              x="27"
              y="42"
              width="26"
              height="26"
              rx="1"
              fill={`url(#${gradId})`}
            />

            {/* Large Ice Cube */}
            <rect
              x="33"
              y="45"
              width="14"
              height="14"
              rx="2.5"
              fill="#ffffff"
              opacity="0.25"
              stroke="#ffffff"
              strokeWidth="0.5"
              strokeOpacity="0.4"
              transform="rotate(12 40 52)"
            />

            {/* Glass Outline */}
            <path
              d="M 24 34 L 25 69 C 25 70, 55 70, 55 69 L 56 34"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.0"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />

            {/* Glass Shine */}
            <rect
              x="25"
              y="34"
              width="30"
              height="34"
              fill="url(#glass-shine)"
              opacity="0.45"
              pointerEvents="none"
            />
          </g>
        )}

        {/* 4. SHOT GLASS */}
        {glassType === "shot" && (
          <g>
            {/* Liquid */}
            <rect
              x="31"
              y="46"
              width="18"
              height="20"
              fill={`url(#${gradId})`}
            />

            {/* Glass Outline */}
            <path
              d="M 28 38 L 30 68 C 30 69, 50 69, 50 68 L 52 38"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeOpacity="0.65"
            />

            {/* Heavy Base block */}
            <path
              d="M 30 64 L 50 64"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeOpacity="0.4"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
