"use client";

import { Sprout } from "lucide-react";

interface LogoProps {
  showText?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ showText = true, className = "", size = "md" }: LogoProps) {
  const containerSizes = {
    sm: "h-7 w-7 rounded-md p-1",
    md: "h-8 w-8 rounded-lg p-1.5",
    lg: "h-10 w-10 rounded-xl p-2",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Premium Green Badge Logo (Pure Vector - 0ms Load, Never Breaks on F5) */}
      <div className={`bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white shadow-xs border border-emerald-500/30 flex items-center justify-center shrink-0 ${containerSizes[size]}`}>
        <Sprout className={`${iconSizes[size]} text-white drop-shadow-xs`} />
      </div>
      {showText && (
        <span className={`font-bold tracking-tight bg-gradient-to-r from-emerald-950 via-green-900 to-teal-950 dark:from-emerald-100 dark:to-green-300 bg-clip-text text-transparent ${textSizes[size]}`}>
          PlantCare
        </span>
      )}
    </div>
  );
}
