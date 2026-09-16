import React, { useState, useRef, useEffect } from "react";
import { Send, Square, Sparkles, SlidersHorizontal } from "lucide-react";
import { TokenSlider } from "./TokenSlider.js";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onGoOn?: () => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  isLmStudioConnected: boolean;
  characterName: string;
  onSavePreference?: (tokens: number) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onGoOn,
  onStopStreaming,
  isStreaming,
  isLmStudioConnected,
  characterName,
  onSavePreference,
}) => {
  const [text, setText] = useState("");
  const [showSlider, setShowSlider] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea bounded smoothly between min 28px and max 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const nextHeight = Math.min(Math.max(scrollHeight, 28), 120);
      textareaRef.current.style.height = `${nextHeight}px`;
      setIsMultiLine(text.includes("\n") || scrollHeight > 36);
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isStreaming || !isLmStudioConnected) return;
    onSendMessage(text.trim());
    setText("");
    setIsMultiLine(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "28px";
    }
  };

  // Detect mobile touch screen devices (phones/tablets)
  const isTouchDevice = () => {
    return (
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On phone / touch screen: let Enter / Return key insert a newline naturally
    if (isTouchDevice()) {
      return;
    }
    // On desktop: Enter sends message, Shift+Enter inserts newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Insert roleplay asterisks (* *) or wrap selected text
  const handleInsertAsterisks = (e: React.MouseEvent) => {
    e.preventDefault();
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;

    if (start !== end) {
      const before = text.substring(0, start);
      const selected = text.substring(start, end);
      const after = text.substring(end);
      const newText = `${before}*${selected}*${after}`;
      setText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end + 2);
      }, 0);
    } else {
      const before = text.substring(0, start);
      const after = text.substring(start);
      const newText = `${before}* *${after}`;
      setText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  const hasText = Boolean(text.trim());

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-1.5">
      {/* Response Length & Bubble Transparency Tray */}
      {showSlider && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <TokenSlider onSavePreference={onSavePreference} />
        </div>
      )}

      {/* Input Area with Detached Action Button */}
      <div
        className={`flex ${
          isMultiLine ? "items-end" : "items-center"
        } gap-1.5 sm:gap-2 w-full`}
      >
        {/* Seamlessly Scrollable Glass Input Box */}
        <div
          className={`flex-1 glass-input rounded-xl sm:rounded-2xl px-2 sm:px-2.5 py-1 sm:py-1.5 min-h-[42px] sm:min-h-[46px] flex ${
            isMultiLine ? "items-end" : "items-center"
          } gap-1 sm:gap-1.5 shadow-xl transition-all min-w-0 border border-white/10 focus-within:border-brand-500/50`}
        >
          {/* Token Slider Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSlider(!showSlider)}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              showSlider
                ? "bg-brand-600/30 text-brand-300 border border-brand-500/40"
                : "hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Adjust AI Response Length & Bubble Transparency"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isLmStudioConnected
                ? "⚠️ LM Studio is offline..."
                : `Message ${characterName}...`
            }
            disabled={!isLmStudioConnected && !isStreaming}
            rows={1}
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder-slate-500 focus:ring-0 focus:outline-none resize-none text-xs sm:text-sm leading-5 py-1 px-1 max-h-28 min-h-[26px] overflow-y-auto disabled:opacity-50"
          />

          {/* Asterisk / Roleplay Shortcut Button (* *) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertAsterisks}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-brand-300 hover:bg-brand-500/20 active:scale-95 transition-all text-base sm:text-lg font-mono font-bold select-none cursor-pointer"
            title="Insert roleplay action (* *)"
          >
            *
          </button>
        </div>

        {/* Detached Floating Action Button: Stop / Send / Go on */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStopStreaming}
            className="w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-xl sm:rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all flex items-center justify-center flex-shrink-0 animate-pulse active:scale-95"
            title="Stop generation"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : hasText ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={!isLmStudioConnected}
            className="w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-xl sm:rounded-2xl bg-gradient-to-tr from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 disabled:bg-dark-800 disabled:text-slate-600 text-white shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center flex-shrink-0 hover:scale-105 active:scale-95 disabled:scale-100"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoOn}
            disabled={!isLmStudioConnected || !onGoOn}
            className="w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-xl sm:rounded-2xl bg-dark-900/90 hover:bg-brand-600/25 text-brand-300 hover:text-brand-100 border border-brand-500/35 hover:border-brand-500/60 shadow-lg transition-all flex items-center justify-center flex-shrink-0 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 group"
            title="Go on (continue the story without typing)"
          >
            <Sparkles className="w-4 h-4 text-brand-400 group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};
