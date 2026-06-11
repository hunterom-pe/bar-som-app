import React, { useState } from "react";
import { FlavorDimension } from "@/lib/types";

interface Option {
  text: string;
  adjustments?: Partial<Record<FlavorDimension, number>>;
  zeroProof?: boolean;
}

interface Question {
  title: string;
  subtitle: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    title: "How do you take your coffee or tea?",
    subtitle: "Select the option that best matches your usual caffeine style.",
    options: [
      {
        text: "☕ Black, bold & dark",
        adjustments: { bitter: 3, sweet: -2, creamy: -2 }
      },
      {
        text: "🥛 Sweet & creamy latte",
        adjustments: { creamy: 3, sweet: 2, bitter: -2 }
      },
      {
        text: "🍵 Light, unsweetened green/iced tea",
        adjustments: { refreshing: 3, sweet: -2, creamy: -2 }
      },
      {
        text: "💧 No caffeine / water only",
        adjustments: {}
      }
    ]
  },
  {
    title: "Select your ideal fruit & citrus vibe:",
    subtitle: "Think about the flavor profiles that satisfy your cravings.",
    options: [
      {
        text: "🍋 Super tart & sour (lime, lemon drops)",
        adjustments: { sour: 3, sweet: -1 }
      },
      {
        text: "🍑 Sweet & juicy (ripe berries, stone peach)",
        adjustments: { fruity: 3, sweet: 2, sour: -1 }
      },
      {
        text: "🍊 Bitter-tart citrus (zesty red grapefruit)",
        adjustments: { bitter: 2, sour: 2, sweet: -2 }
      },
      {
        text: "🌿 I prefer non-fruity profiles",
        adjustments: {}
      }
    ]
  },
  {
    title: "What is your preference on spirit strength?",
    subtitle: "This will help us gauge the intensity of alcohol you enjoy.",
    options: [
      {
        text: "🥃 Spirit-forward & strong (Negronis, Manhattans)",
        adjustments: { boozy: 3, refreshing: -2 }
      },
      {
        text: "🍹 Balanced (standard cocktail strength)",
        adjustments: { refreshing: 1 }
      },
      {
        text: "🥂 Light & easy-going (low-ABV spritzes/collins)",
        adjustments: { boozy: -3, refreshing: 3 }
      },
      {
        text: "🍋 strictly zero-proof (non-alcoholic only)",
        zeroProof: true
      }
    ]
  },
  {
    title: "Do you enjoy herbal or botanical notes?",
    subtitle: "Think fresh herbs, piney juniper, or complex aromatics.",
    options: [
      {
        text: "🌿 Love them (gin, chartreuse, fresh mint/rosemary)",
        adjustments: { herbal: 4, bitter: 1 }
      },
      {
        text: "🍃 In moderation (subtle basil or mint accents)",
        adjustments: { herbal: 2 }
      },
      {
        text: "❌ Not a fan (keep it simple and clean)",
        adjustments: { herbal: -2 }
      }
    ]
  },
  {
    title: "Do you enjoy smoky or peaty elements?",
    subtitle: "Like a campfire aroma, roasted agave, or peated single malt.",
    options: [
      {
        text: "🔥 Yes, love them (smoky mezcal, peated scotch)",
        adjustments: { smoky: 4 }
      },
      {
        text: "💨 Just a hint (soft woodsmoke or roasted agave)",
        adjustments: { smoky: 2 }
      },
      {
        text: "🚫 No smoke at all (prefer clean/crisp)",
        adjustments: { smoky: -3 }
      }
    ]
  },
  {
    title: "What's your spice or heat tolerance?",
    subtitle: "Do you like a fiery kick or warming baking spices in your glass?",
    options: [
      {
        text: "🌶️ Bring the heat (spicy jalapeño, hot ginger)",
        adjustments: { spicy: 4 }
      },
      {
        text: "🍂 Subtle warmth (cinnamon, nutmeg, mild ginger beer)",
        adjustments: { spicy: 2 }
      },
      {
        text: "❄️ Cool and mild (no heat whatsoever)",
        adjustments: { spicy: -3 }
      }
    ]
  }
];

interface PalateCalibrationProps {
  onComplete: (affinities: Record<FlavorDimension, number>, zeroProof: boolean) => void;
  onCancel?: () => void;
}

export const PalateCalibration: React.FC<PalateCalibrationProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<-1 | number>(-1); // -1 is intro
  const [selections, setSelections] = useState<Option[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const startQuiz = () => {
    setStep(0);
    setSelections([]);
  };

  const handleOptionSelect = (option: Option) => {
    const nextSelections = [...selections, option];
    setSelections(nextSelections);

    if (step < QUESTIONS.length - 1) {
      setStep((prev) => (prev as number) + 1);
    } else {
      // Quiz complete! Show loading/calibrating screen
      setIsCalibrating(true);
      
      // Calculate new affinities
      const initialAffinities: Record<FlavorDimension, number> = {
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

      let zeroProofSelected = false;

      nextSelections.forEach((sel) => {
        if (sel.zeroProof) {
          zeroProofSelected = true;
          // Zero proof typically means low booziness, high refreshing
          initialAffinities.boozy = 1;
          initialAffinities.refreshing = 8;
        }

        if (sel.adjustments) {
          Object.entries(sel.adjustments).forEach(([dim, val]) => {
            const flavorDim = dim as FlavorDimension;
            initialAffinities[flavorDim] = Math.max(1, Math.min(10, initialAffinities[flavorDim] + val));
          });
        }
      });

      // Simulate a beautiful calculation step
      setTimeout(() => {
        onComplete(initialAffinities, zeroProofSelected);
      }, 2400);
    }
  };

  // Intro Screen
  if (step === -1) {
    return (
      <div className="flex flex-col flex-grow justify-between animate-reveal h-full select-none">
        <div className="space-y-6 my-auto text-center px-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🎯</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold font-serif tracking-tight text-zinc-100">
              Palate Calibration
            </h2>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Answer 6 brief taste-bud questions to customize your radar chart before you scan menus.
            </p>
          </div>

          <div className="pt-4 max-w-xs mx-auto text-left space-y-3 bg-zinc-900/40 rounded-2xl p-4 border border-zinc-900">
            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="text-amber-500 font-bold font-mono">1.</span>
              <span>Directly updates your flavor affinities.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="text-amber-500 font-bold font-mono">2.</span>
              <span>Determines zero-proof preferences automatically.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-zinc-300">
              <span className="text-amber-500 font-bold font-mono">3.</span>
              <span>Refines recommendations immediately.</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-6">
          <button
            onClick={startQuiz}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-2xl text-lg tracking-wide transition-all active:scale-[0.98] cursor-pointer"
          >
            Start Quiz
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-3 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calibrating Overlay
  if (isCalibrating) {
    return (
      <div className="flex flex-col flex-grow justify-between animate-reveal h-full select-none">
        <div className="my-auto flex flex-col items-center justify-center space-y-6">
          {/* Animated pulsing/morphing radar shape mock */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Outermost pulsing ring */}
            <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping" />
            {/* Spinning/pulsing morphing pentagon */}
            <svg
              viewBox="0 0 100 100"
              className="w-28 h-28 text-amber-500/40 fill-amber-500/10 animate-spin"
              style={{ animationDuration: "12s" }}
            >
              <polygon
                points="50,15 80,35 70,75 30,75 20,35"
                stroke="currentColor"
                strokeWidth="1.5"
                className="animate-pulse"
                style={{ animationDuration: "2s" }}
              />
            </svg>
            <span className="absolute text-2xl animate-pulse">🍋</span>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold font-serif text-amber-500 animate-pulse">
              Calibrating Your Palate
            </h3>
            <p className="text-xs text-zinc-400 font-mono tracking-wide uppercase">
              Mapping flavor coordinates...
            </p>
          </div>
        </div>
        <div className="pb-12 text-center text-[10px] text-zinc-500 font-mono">
          BARSOM COCKTAIL ENGINE v1.2
        </div>
      </div>
    );
  }

  const currentQuestion = QUESTIONS[step];

  return (
    <div className="flex flex-col flex-grow justify-between animate-reveal h-full select-none">
      {/* Header with Progress Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-500 uppercase tracking-wider">Taste Profile Quiz</span>
          <span className="text-amber-500 font-bold">
            {step + 1} / {QUESTIONS.length}
          </span>
        </div>
        
        {/* Progress Bar Container */}
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-850">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Text */}
      <div className="space-y-2 py-4">
        <h3 className="text-2xl font-extrabold font-serif text-zinc-100 leading-tight">
          {currentQuestion.title}
        </h3>
        <p className="text-xs text-zinc-400 font-medium leading-relaxed">
          {currentQuestion.subtitle}
        </p>
      </div>

      {/* Options Stack */}
      <div className="flex-grow flex flex-col justify-center gap-3 py-4">
        {currentQuestion.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleOptionSelect(opt)}
            className="w-full text-left p-4.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850/80 hover:border-amber-500/40 rounded-2xl text-zinc-200 hover:text-white hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all cursor-pointer font-medium active:scale-[0.99] text-sm"
          >
            {opt.text}
          </button>
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="pb-6">
        <button
          onClick={() => {
            if (step === 0) {
              setStep(-1);
            } else {
              setStep((prev) => (prev as number) - 1);
              setSelections((prev) => prev.slice(0, -1));
            }
          }}
          className="w-full py-3 bg-transparent hover:bg-zinc-900/50 border border-zinc-900 text-zinc-500 hover:text-zinc-400 font-semibold rounded-2xl text-sm transition-all cursor-pointer"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};
