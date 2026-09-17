import React, { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { SPINNER_VERBS } from "../../constants/spinnerVerbs.js";

interface ThinkingIndicatorProps {
  className?: string;
  subtle?: boolean;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  className = "",
  subtle = false,
}) => {
  const [currentVerb, setCurrentVerb] = useState(() => {
    const initialIndex = Math.floor(Math.random() * SPINNER_VERBS.length);
    return SPINNER_VERBS[initialIndex] || "Thinking";
  });
  const [isFading, setIsFading] = useState(false);
  const verbRef = useRef(currentVerb);
  verbRef.current = currentVerb;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setIsFading(true);

      setTimeout(() => {
        // Pick next random verb different from the current one
        let nextIndex = Math.floor(Math.random() * SPINNER_VERBS.length);
        while (SPINNER_VERBS[nextIndex] === verbRef.current && SPINNER_VERBS.length > 1) {
          nextIndex = Math.floor(Math.random() * SPINNER_VERBS.length);
        }
        setCurrentVerb(SPINNER_VERBS[nextIndex]);
        // Fade in
        setIsFading(false);
      }, 250);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      data-testid="thinking-indicator"
      className={`inline-flex items-center gap-2 py-1 px-1 select-none ${className}`}
      aria-live="polite"
    >
      {/* Animated Glowing Spark */}
      <div className="relative flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-spin [animation-duration:4s]" />
        <span className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-brand-400/20 blur-[2px] animate-pulse" />
      </div>

      {/* Dynamic Verb with Smooth Cross-Fade */}
      <div className="flex items-center">
        <span
          className={`font-medium italic tracking-wide text-xs sm:text-[13px] text-brand-200/95 transition-all duration-200 transform ${
            isFading ? "opacity-0 -translate-y-1 scale-95" : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {currentVerb}
        </span>

        {/* Triple Rhythmic Pulsing Dots */}
        <span className="inline-flex items-center gap-1 ml-1.5 text-brand-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-duration:1s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
        </span>
      </div>
    </div>
  );
};
