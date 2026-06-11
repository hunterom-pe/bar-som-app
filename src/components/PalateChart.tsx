import React from "react";
import { FlavorDimension } from "@/lib/types";
import { FLAVOR_DIMENSIONS } from "@/lib/recommendation";

interface PalateChartProps {
  affinities: Record<FlavorDimension, number>;
  drinkAffinities?: Record<FlavorDimension, number>;
  drinkName?: string;
}

export const PalateChart: React.FC<PalateChartProps> = ({ 
  affinities,
  drinkAffinities,
  drinkName
}) => {
  const size = 300;
  const center = size / 2;
  const maxRadius = 100;
  const numDimensions = FLAVOR_DIMENSIONS.length;

  // Compute points for the grid lines and axes
  const getCoordinates = (index: number, val: number) => {
    const angle = (index * 2 * Math.PI) / numDimensions - Math.PI / 2;
    const radius = (val / 10) * maxRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  };

  // 1. Grid lines (decagons) at levels 2, 4, 6, 8, 10
  const gridLevels = [2, 4, 6, 8, 10];
  const gridPaths = gridLevels.map(level => {
    const points = Array.from({ length: numDimensions }, (_, i) => {
      const { x, y } = getCoordinates(i, level);
      return `${x},${y}`;
    }).join(" ");
    return points;
  });

  // 2. User data polygon
  const dataPoints = FLAVOR_DIMENSIONS.map((dim, i) => {
    const val = affinities[dim] ?? 5;
    const { x, y } = getCoordinates(i, val);
    return `${x},${y}`;
  }).join(" ");

  // Drink data polygon (optional overlay)
  const drinkDataPoints = drinkAffinities
    ? FLAVOR_DIMENSIONS.map((dim, i) => {
        const val = drinkAffinities[dim] ?? 0;
        const { x, y } = getCoordinates(i, val);
        return `${x},${y}`;
      }).join(" ")
    : "";

  // 3. Axis lines and text label coordinates
  const axes = FLAVOR_DIMENSIONS.map((dim, i) => {
    const outer = getCoordinates(i, 10);
    const labelPos = getCoordinates(i, 12); // place text labels slightly further out

    // Helper to capitalize label and format nicely
    const displayName = dim.charAt(0).toUpperCase() + dim.slice(1);

    return {
      dim,
      x1: center,
      y1: center,
      x2: outer.x,
      y2: outer.y,
      labelX: labelPos.x,
      labelY: labelPos.y,
      displayName
    };
  });

  return (
    <div className="w-full flex flex-col items-center justify-center py-4">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[320px] aspect-square select-none overflow-visible"
        aria-label="Palate affinity radar chart"
      >
        {/* Draw concentric decagon grid lines */}
        {gridPaths.map((path, idx) => (
          <polygon
            key={idx}
            points={path}
            fill="none"
            stroke="#374151" // dark gray grid line
            strokeWidth="1"
            strokeDasharray={idx === gridPaths.length - 1 ? "none" : "2,2"}
          />
        ))}

        {/* Draw concentric grid labels */}
        {gridLevels.map((level, idx) => {
          const pos = getCoordinates(0, level);
          return (
            <text
              key={idx}
              x={pos.x + 4}
              y={pos.y + 4}
              fill="#9ca3af"
              fontSize="8"
              className="font-mono"
            >
              {level}
            </text>
          );
        })}

        {/* Draw axis lines */}
        {axes.map((axis, idx) => (
          <line
            key={idx}
            x1={axis.x1}
            y1={axis.y1}
            x2={axis.x2}
            y2={axis.y2}
            stroke="#4b5563"
            strokeWidth="1"
          />
        ))}

        {/* Shaded user palate polygon */}
        <polygon
          points={dataPoints}
          fill="rgba(245, 158, 11, 0.2)" // semi-transparent amber
          stroke="#f59e0b" // solid amber border
          strokeWidth="2.5"
          className="transition-all duration-500 ease-out"
        />

        {/* Shaded drink palate polygon (optional overlay) */}
        {drinkAffinities && drinkDataPoints && (
          <polygon
            points={drinkDataPoints}
            fill="rgba(20, 184, 166, 0.12)" // semi-transparent teal
            stroke="#14b8a6" // solid teal border
            strokeWidth="2.2"
            strokeDasharray="4,3"
            className="transition-all duration-500 ease-out"
          />
        )}

        {/* Draw user data points as glowing dots */}
        {FLAVOR_DIMENSIONS.map((dim, i) => {
          const val = affinities[dim] ?? 5;
          const { x, y } = getCoordinates(i, val);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4.5"
              fill="#fbbf24" // bright amber dot
              stroke="#1f2937"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Draw drink data points as teal glowing dots (optional overlay) */}
        {drinkAffinities && FLAVOR_DIMENSIONS.map((dim, i) => {
          const val = drinkAffinities[dim] ?? 0;
          const { x, y } = getCoordinates(i, val);
          return (
            <circle
              key={`drink-${i}`}
              cx={x}
              cy={y}
              r="3.5"
              fill="#2dd4bf" // bright teal dot
              stroke="#1f2937"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Label text */}
        {axes.map((axis, idx) => {
          // Adjust text alignment based on position relative to center
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (axis.labelX > center + 10) textAnchor = "start";
          if (axis.labelX < center - 10) textAnchor = "end";

          // Adjust vertical offset slightly
          let dy = "0.33em";
          if (axis.labelY < center - maxRadius) dy = "-0.2em"; // top label
          if (axis.labelY > center + maxRadius) dy = "0.8em";  // bottom label

          return (
            <text
              key={idx}
              x={axis.labelX}
              y={axis.labelY}
              textAnchor={textAnchor}
              dy={dy}
              fill="#fbbf24" // amber color for readability in dim bar
              fontSize="10"
              fontWeight="600"
              className="font-sans uppercase tracking-wider"
            >
              {axis.displayName}
            </text>
          );
        })}
      </svg>

      {/* Legend for dual profile chart */}
      {drinkAffinities && (
        <div className="flex justify-center gap-6 mt-1 text-[10px] font-mono tracking-wider uppercase select-none animate-reveal">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-zinc-950" />
            <span className="text-zinc-400">Your Palate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 border border-zinc-950" />
            <span className="text-zinc-400">{drinkName || "Cocktail"}</span>
          </div>
        </div>
      )}
    </div>
  );
};
