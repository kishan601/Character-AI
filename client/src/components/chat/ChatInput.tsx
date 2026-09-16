import React, { useState, useRef, useEffect } from "react";
import { Send, Square, Sparkles, SlidersHorizontal, Play } from "lucide-react";
import { TokenSlider } from "./TokenSlider.js";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  isLmStudioConnected: boolean;
  characterName: string;
  onSavePreference?: (tokens: number) => void;
  onGoOn?: () => void;
  hasMessages?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  isLmStudioConnected,
  characterName,
  onSavePreference,
  onGoOn,
  hasMessages = false,
}) => {
  const [text, setText] = useState("");
  const [showSlider, setShowSlider] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isStreaming || !isLmStudioConnected) return;
    onSendMessage(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-2">
      {/* Quick Actions Bar (Go On button) */}
      {hasMessages && !isStreaming && onGoOn && (
        <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <button
            type="button"
            onClick={onGoOn}
            disabled={!isLmStudioConnected}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-600/20 hover:bg-brand-600/35 text-brand-300 hover:text-brand-200 border border-brand-500/30 text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-brand-500/15 hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:pointer-events-none group"
            title={`Prompt ${characterName} to continue the story or dialogue without sending a user message`}
          >
            <Play className="w-3 h-3 fill-current text-brand-400 group-hover:text-brand-300 transition-colors" />
            <span>Go On</span>
          </button>
        </div>
      )}

      {/* Response Length Slider Tray */}
      {showSlider && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <TokenSlider onSavePreference={onSavePreference} />
        </div>
      )}

      {/* Main Input Bar */}
      <div className="glass-input rounded-2xl p-2.5 flex items-end gap-2 shadow-2xl transition-all">
        {/* Token Slider Toggle Button */}
        <button
          type="button"
          onClick={() => setShowSlider(!showSlider)}
          className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
            showSlider
              ? "bg-brand-600/30 text-brand-300 border border-brand-500/40"
              : "hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
          title="Adjust AI Response Length (Slider)"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !isLmStudioConnected
              ? "⚠️ LM Studio is offline. Start LM Studio on port 1234 to chat..."
              : `Message ${characterName}... (Press Enter to send, Shift+Enter for new line)`
          }
          disabled={!isLmStudioConnected && !isStreaming}
          rows={1}
          className="flex-1 bg-transparent border-0 text-slate-100 placeholder-slate-500 focus:ring-0 focus:outline-none resize-none text-[15px] leading-relaxed py-1.5 px-1 max-h-48 overflow-y-auto disabled:opacity-50"
        />

        {/* Send / Stop Generating Button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStopStreaming}
            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all flex items-center justify-center flex-shrink-0 animate-pulse"
            title="Stop generation"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || !isLmStudioConnected}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-dark-800 disabled:text-slate-600 text-white shadow-lg shadow-brand-500/20 disabled:shadow-none transition-all flex items-center justify-center flex-shrink-0 hover:scale-105 active:scale-95 disabled:scale-100"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
