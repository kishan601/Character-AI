import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sliders, Eye } from "lucide-react";
import { RootState } from "../../store/store.js";
import { setMaxTokens, setBubbleOpacity } from "../../store/chatSlice.js";

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
  const bubbleOpacity = useSelector((state: RootState) => state.chat.bubbleOpacity ?? 70);

  const getLengthLabel = (tokens: number) => {
    if (tokens <= 180) return { text: "Short & Snappy", color: "text-emerald-400" };
    if (tokens <= 500) return { text: "Medium RP", color: "text-blue-400" };
    if (tokens <= 1000) return { text: "Long / Detailed", color: "text-purple-400" };
    return { text: "Novel / Expansive", color: "text-amber-400" };
  };

  const getOpacityLabel = (opacity: number) => {
    if (opacity === 0) return { text: "100% Transparent", color: "text-emerald-400" };
    if (opacity <= 35) return { text: "Ghost Glass", color: "text-blue-400" };
    if (opacity <= 75) return { text: "Frosted Glass", color: "text-purple-400" };
    return { text: "Solid Card", color: "text-amber-400" };
  };

  const lengthInfo = getLengthLabel(maxTokens);
  const opacityInfo = getOpacityLabel(bubbleOpacity);

  const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    dispatch(setMaxTokens(val));
    onSavePreference?.(val);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    dispatch(setBubbleOpacity(val));
  };

  return (
    <div className={`flex flex-col gap-2.5 px-3.5 py-2.5 rounded-2xl bg-dark-900/90 border border-white/10 backdrop-blur-md shadow-2xl ${className}`}>
      {/* 1. Response Length */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Sliders className="w-3.5 h-3.5 text-brand-400" />
            <span>Response Length</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold ${lengthInfo.color}`}>{lengthInfo.text}</span>
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
            onChange={handleTokensChange}
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

      <div className="border-t border-white/5" />

      {/* 2. Bubble Transparency Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>Bubble Transparency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold ${opacityInfo.color}`}>{opacityInfo.text}</span>
            <span className="text-[11px] text-slate-400 font-mono bg-dark-950 px-1.5 py-0.5 rounded border border-white/5">
              {bubbleOpacity}%
            </span>
          </div>
        </div>

        <div className="relative flex items-center">
          <input
            id="bubble-opacity-slider"
            type="range"
            min={0}
            max={100}
            step={5}
            value={bubbleOpacity}
            onChange={handleOpacityChange}
            className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 px-0.5 select-none font-mono">
          <span>0% (Text only)</span>
          <span>35% (Ghost)</span>
          <span>70% (Glass)</span>
          <span>100% (Solid)</span>
        </div>
      </div>
    </div>
  );
};
