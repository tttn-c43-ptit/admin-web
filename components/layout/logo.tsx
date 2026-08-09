"use client";

import { useState } from "react";
import { Sprout } from "lucide-react";

interface LogoProps {
  showText?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ showText = true, className = "", size = "md" }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  const containerSizes = {
    sm: "h-7 w-7 rounded-md p-0.5",
    md: "h-9 w-9 rounded-lg p-1",
    lg: "h-11 w-11 rounded-xl p-1.5",
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
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`bg-emerald-600/10 border border-emerald-500/20 shadow-xs flex items-center justify-center overflow-hidden shrink-0 ${containerSizes[size]}`}>
        {!imgError ? (
          <img
            src="/images/logo.png"
            alt="PlantCare Logo"
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Sprout className={`${iconSizes[size]} text-emerald-600`} />
        )}
      </div>
      {showText && (
        <span className={`font-bold tracking-tight text-emerald-950 dark:text-emerald-50 ${textSizes[size]}`}>
          PlantCare
        </span>
      )}
    </div>
  );
}
