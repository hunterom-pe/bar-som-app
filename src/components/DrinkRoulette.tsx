import React, { useState, useEffect, useRef } from "react";
import { ParsedDrink } from "@/lib/types";

interface DrinkRouletteProps {
  drinks: ParsedDrink[];
  onLanding: (drink: ParsedDrink) => void;
  onClose: () => void;
}

export const DrinkRoulette: React.FC<DrinkRouletteProps> = ({ drinks, onLanding, onClose }) => {
  const [rotation, setRotation] = useState(0);
  const [needleWiggle, setNeedleWiggle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  
  const rotationRef = useRef(0);
  const needleWiggleRef = useRef(0);
  const velocityRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const lastIndexRef = useRef(-1);
  const isSpinningRef = useRef(false);

  const numSlices = drinks.length;
  const sliceAngle = 360 / numSlices;
  const sliceAngleRad = (Math.PI * 2) / numSlices;

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Web Audio click synthesizer
  const playTickSound = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // AudioContext is blocked or unsupported
    }
  };

  // Trigger device vibration
  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(6);
    }
  };

  const spin = () => {
    if (isSpinningRef.current || numSlices === 0) return;
    
    setIsSpinning(true);
    isSpinningRef.current = true;
    
    // Set a high initial spin velocity (degrees per frame)
    velocityRef.current = 16 + Math.random() * 12;
    lastIndexRef.current = -1;

    const animate = () => {
      // 1. Update rotation angle
      rotationRef.current += velocityRef.current;
      setRotation(rotationRef.current);

      // 2. Wiggle needle decay
      if (needleWiggleRef.current > 0) {
        needleWiggleRef.current -= 1.5;
        if (needleWiggleRef.current < 0) needleWiggleRef.current = 0;
      }
      setNeedleWiggle(needleWiggleRef.current);

      // 3. Detect slice transitions
      // Slices are laid out clockwise. The pointer needle is at 270 degrees (straight up).
      // Math: slice index under top pointer
      const currentSliceIndex = Math.floor(
        ((270 - rotationRef.current) % 360 + 360) % 360 / sliceAngle
      ) % numSlices;

      if (currentSliceIndex !== lastIndexRef.current) {
        lastIndexRef.current = currentSliceIndex;
        needleWiggleRef.current = 14; // trigger needle wiggle
        playTickSound();
        triggerHaptic();
      }

      // 4. Decelerate spin
      velocityRef.current *= 0.983;

      if (velocityRef.current < 0.05) {
        setIsSpinning(false);
        isSpinningRef.current = false;
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }
        // Final pick
        const finalPick = drinks[currentSliceIndex];
        setTimeout(() => {
          onLanding(finalPick);
        }, 600);
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  // Helper to generate SVG slice paths
  const makeSlicePath = (index: number) => {
    const cx = 160;
    const cy = 160;
    const r = 148;
    
    const startAngle = index * sliceAngleRad - Math.PI / 2;
    const endAngle = (index + 1) * sliceAngleRad - Math.PI / 2;

    const startX = cx + r * Math.cos(startAngle);
    const startY = cy + r * Math.sin(startAngle);
    const endX = cx + r * Math.cos(endAngle);
    const endY = cy + r * Math.sin(endAngle);

    // Flag is 0 because slices are always <= 180 degrees
    return `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY} Z`;
  };

  // Color theme generator for slices
  const getSliceColor = (index: number) => {
    const themes = [
      "fill-zinc-950/95 stroke-zinc-800/60",
      "fill-zinc-900/95 stroke-zinc-800/60",
      "fill-zinc-850/95 stroke-zinc-800/60"
    ];
    return themes[index % themes.length];
  };

  return (
    <div className="flex flex-col flex-grow justify-between items-center animate-reveal h-full select-none text-zinc-100">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center border-b border-zinc-900 pb-3">
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="text-zinc-500 hover:text-zinc-400 font-mono text-xs disabled:opacity-30 cursor-pointer"
        >
          ← Back
        </button>
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
          Drink Roulette
        </span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="text-center space-y-1 mt-4">
        <h3 className="text-2xl font-extrabold font-serif text-amber-500">
          Let Fate Decide
        </h3>
        <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
          Tapping spin will pick one of the top 10 matches on the menu.
        </p>
      </div>

      {/* Roulette Wheel Viewport */}
      <div className="relative w-80 h-80 my-auto flex items-center justify-center select-none">
        
        {/* Outer glowing border ring */}
        <div className="absolute inset-0 rounded-full border border-zinc-900 shadow-[0_0_30px_rgba(245,158,11,0.04)]" />
        
        {/* Wheel SVG */}
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full transform transition-shadow"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "160px 160px"
          }}
        >
          <g>
            {/* Draw Slices */}
            {drinks.map((drink, idx) => (
              <g key={drink.id}>
                <path
                  d={makeSlicePath(idx)}
                  className={`${getSliceColor(idx)} stroke-[1] transition-colors`}
                />
                
                {/* Rotated text inside each slice */}
                {/* Rotate group around wheel center to place text at radial midline */}
                <g transform={`rotate(${(idx * sliceAngle) + (sliceAngle / 2)}, 160, 160)`}>
                  <text
                    x={288}
                    y={160}
                    dy="0.35em"
                    textAnchor="end"
                    className="text-[9px] font-bold fill-zinc-400 font-mono uppercase tracking-wider select-none pointer-events-none"
                  >
                    {drink.name.length > 18 ? drink.name.slice(0, 16) + "..." : drink.name}
                  </text>
                </g>
              </g>
            ))}
          </g>
          
          {/* Innermost ring */}
          <circle cx="160" cy="160" r="42" className="fill-zinc-950 stroke-zinc-800 stroke-2" />
        </svg>

        {/* Top Needle Pointer (Static frame, wiggles on ticks) */}
        <div 
          className="absolute -top-1 left-[148px] w-6 h-8 flex justify-center origin-top pointer-events-none z-10"
          style={{
            transform: `rotate(${needleWiggle}deg)`
          }}
        >
          <svg viewBox="0 0 24 32" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
            <path
              d="M 12 32 L 2 8 C 2 4, 22 4, 22 8 Z"
              className="fill-amber-500 stroke-zinc-950 stroke-[2.5]"
            />
            {/* Pin head */}
            <circle cx="12" cy="8" r="3.5" className="fill-zinc-950" />
          </svg>
        </div>

        {/* Central Spin Button */}
        <button
          onClick={spin}
          disabled={isSpinning}
          className="absolute w-20 h-20 rounded-full bg-amber-500 disabled:bg-zinc-900 border-[3px] border-zinc-950 shadow-[0_4px_15px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 disabled:scale-100 disabled:shadow-none hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:cursor-not-allowed z-20 select-none"
        >
          <span className="text-[11px] font-mono font-bold text-zinc-950 disabled:text-zinc-500 uppercase tracking-widest leading-none mt-1">
            {isSpinning ? "SPIN" : "SPIN"}
          </span>
          {!isSpinning && (
            <span className="text-zinc-950 text-xs mt-0.5 leading-none">🎰</span>
          )}
        </button>
      </div>

      {/* Footer Instructions */}
      <div className="pb-8 text-center text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
        {isSpinning ? "Spinning..." : "Click center button to spin"}
      </div>
    </div>
  );
};
