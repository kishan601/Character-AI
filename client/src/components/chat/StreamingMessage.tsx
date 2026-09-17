import React from "react";
import { Character } from "../../api/baseApi.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { Bot, Sparkles } from "lucide-react";

interface StreamingMessageProps {
  character: Character;
  streamingText: string;
  assistantBubbleStyle: React.CSSProperties;
  textContrastClass: string;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = React.memo(
  ({ character, streamingText, assistantBubbleStyle, textContrastClass }) => {
    return (
      <div className="flex justify-start w-full animate-in fade-in duration-150">
        <div
          style={assistantBubbleStyle}
          className="flex items-start gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border w-fit max-w-[88%] sm:max-w-[82%]"
        >
          <div className="flex-shrink-0 mt-0.5">
            {character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt={character.name}
                decoding="async"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 shadow-sm ring-1 ring-brand-500/30 animate-pulse"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-900/60 flex items-center justify-center text-brand-300 border border-white/10 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`font-semibold text-xs sm:text-[13px] text-slate-100 ${textContrastClass}`}>
                {character.name}
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 animate-spin" /> Generating...
              </span>
            </div>
            {streamingText ? (
              <div className={textContrastClass}>
                <MarkdownRenderer content={streamingText} />
              </div>
            ) : (
              <div className="flex items-center gap-1 py-1 text-slate-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1.5 font-mono text-[10px] text-brand-300">Formulating response...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

StreamingMessage.displayName = "StreamingMessage";
