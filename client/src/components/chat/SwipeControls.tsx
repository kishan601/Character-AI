import React from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface SwipeControlsProps {
  currentIndex: number;
  totalSwipes: number;
  onPrev: () => void;
  onNext: () => void;
  onRegenerate: () => void;
  canRegenerate?: boolean;
  isStreaming?: boolean;
}

export const SwipeControls: React.FC<SwipeControlsProps> = ({
  currentIndex,
  totalSwipes,
  onPrev,
  onNext,
  onRegenerate,
  canRegenerate = true,
  isStreaming = false,
}) => {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-dark-950/60 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-sm select-none">
      {/* Previous Swipe */}
      <button
        type="button"
        onClick={onPrev}
        disabled={currentIndex === 0 || isStreaming}
        className="p-0.5 rounded hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
        title="Previous response"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Swipe counter: e.g. 1/3 */}
      <span className="font-mono text-[11px] px-1 text-slate-300">
        {currentIndex + 1} / {totalSwipes}
      </span>

      {/* Next Swipe */}
      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex >= totalSwipes - 1 || isStreaming}
        className="p-0.5 rounded hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
        title="Next response"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Regenerate Alternate Button (Only available for latest assistant turn) */}
      {canRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isStreaming}
          className="ml-1 pl-1.5 border-l border-white/10 flex items-center gap-1 hover:text-brand-300 disabled:opacity-30 transition-colors text-[11px]"
          title="Generate alternate response (Swipe right)"
        >
          <RefreshCw className={`w-3 h-3 ${isStreaming ? "animate-spin" : ""}`} />
          <span>New</span>
        </button>
      )}
    </div>
  );
};
