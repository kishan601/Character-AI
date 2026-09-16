import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff } from "lucide-react";
import { RootState } from "../../store/store.js";
import { toggleZenMode } from "../../store/uiSlice.js";

interface ZenToggleButtonProps {
  className?: string;
}

export const ZenToggleButton: React.FC<ZenToggleButtonProps> = ({ className = "" }) => {
  const dispatch = useDispatch();
  const zenMode = useSelector((state: RootState) => state.ui.zenMode);

  return (
    <button
      id="zen-wallpaper-toggle"
      type="button"
      onClick={() => dispatch(toggleZenMode())}
      title={zenMode ? "Show chat (Click to restore)" : "Hide chat (Zen Wallpaper mode)"}
      className={`relative group flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 ${
        zenMode
          ? "bg-brand-600/80 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-500 border border-brand-400/40"
          : "bg-dark-900/80 hover:bg-dark-800 text-slate-300 hover:text-white border border-white/10 shadow-sm backdrop-blur-md"
      } ${className}`}
    >
      {zenMode ? (
        <EyeOff className="w-4 h-4 transition-transform group-hover:scale-110" />
      ) : (
        <Eye className="w-4 h-4 transition-transform group-hover:scale-110" />
      )}

      {/* Subtle floating badge */}
      <span className="absolute -bottom-8 right-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-dark-950/90 text-xs px-2 py-1 rounded text-slate-200 whitespace-nowrap border border-white/10 shadow-xl backdrop-blur-md">
        {zenMode ? "Restore Chat View" : "Clean Wallpaper View"}
      </span>
    </button>
  );
};
