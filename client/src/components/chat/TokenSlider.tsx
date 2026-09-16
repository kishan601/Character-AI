import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sliders, Sparkles } from "lucide-react";
import { RootState } from "../../store/store.js";
import { setMaxTokens } from "../../store/chatSlice.js";

interface TokenSliderProps {
  className?: string;
  onSavePreference?: (tokens: number) => void;
}

export const TokenSlider: React.FC<TokenSliderProps> = ({
  className = "",
  onSavePreference,
}) => {
  const dispatch = useDispatch();
  const maxTokens = useSelector((state: RootState) => state.chat.currentMaxTokens);

  const getLengthLabel = (tokens: number) => {
    if (tokens <= 180) return { text: "Short & Snappy", color: "text-emerald-400" };
    if (tokens <= 500) return { text: "Medium RP", color: "text-blue-400" };
    if (tokens <= 1000) return { text: "Long / Detailed", color: "text-purple-400" };
    return { text: "Novel / Expansive", color: "text-amber-400" };
  };

  const labelInfo = getLengthLabel(maxTokens);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    dispatch(setMaxTokens(val));
    onSavePreference?.(val);
  };

  return (
    <div className={`flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-dark-900/80 border border-white/10 backdrop-blur-md ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Sliders className="w-3.5 h-3.5 text-brand-400" />
          <span>Response Length</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold ${labelInfo.color}`}>{labelInfo.text}</span>
          <span className="text-[11px] text-slate-400 font-mono bg-dark-950 px-1.5 py-0.5 rounded border border-white/5">
            {maxTokens} tokens
          </span>
        </div>
      </div>

      <div className="relative flex items-center">
        <input
          id="token-length-slider"
          type="range"
          min={60}
          max={2000}
          step={20}
          value={maxTokens}
          onChange={handleChange}
          className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400 transition-all"
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 px-0.5 select-none font-mono">
        <span>60</span>
        <span>400</span>
        <span>1000</span>
        <span>2000</span>
      </div>
    </div>
  );
};
