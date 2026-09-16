import React, { useState } from "react";
import {
  Edit3,
  Check,
  X,
  Bookmark,
  Copy,
  Bot,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { Message, Character, UserPersona } from "../../api/baseApi.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { SwipeControls } from "./SwipeControls.js";

interface MessageBubbleProps {
  message: Message;
  character: Character;
  userPersona?: UserPersona | null;
  isLastAssistant: boolean;
  isStreaming?: boolean;
  isRegeneratingThis?: boolean;
  regeneratingText?: string;
  onEdit: (messageId: string, newContent: string) => Promise<void>;
  onSwitchSwipe: (messageId: string, newIndex: number) => Promise<void>;
  onRegenerateSwipe: (messageId: string) => Promise<void>;
  onPinMemory: (content: string) => Promise<void>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  character,
  userPersona,
  isLastAssistant,
  isStreaming = false,
  isRegeneratingThis = false,
  regeneratingText = "",
  onEdit,
  onSwitchSwipe,
  onRegenerateSwipe,
  onPinMemory,
}) => {
  const isAssistant = message.sender === "assistant";
  const swipes = message.swipes || [];
  const activeIndex = message.activeSwipeIndex ?? 0;
  const currentText = swipes[activeIndex] || swipes[0] || "";

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(currentText);
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await onEdit(message.id, editText);
    setIsEditing(false);
  };

  const handleSwitchSwipe = async (newIndex: number) => {
    if (!isLastAssistant) {
      const confirmSwitch = window.confirm(
        "Notice: Switching an earlier response branches the conversation context. Subsequent replies may not match this new variant. Continue?"
      );
      if (!confirmSwitch) return;
    }
    await onSwitchSwipe(message.id, newIndex);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePin = async () => {
    await onPinMemory(currentText);
    setPinned(true);
    setTimeout(() => setPinned(false), 2500);
  };

  const avatarUrl = isAssistant
    ? character.avatarUrl
    : userPersona?.avatarUrl;
  const senderName = isAssistant ? character.name : (userPersona?.name || "You");

  // USER MESSAGE: Compact bubble fitting content with zero void on the right
  if (!isAssistant) {
    return (
      <div className="flex justify-end w-full animate-in fade-in duration-150">
        <div className="group relative w-fit max-w-[78%] bg-brand-950/70 border border-brand-500/35 hover:border-brand-500/50 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg transition-all">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-brand-300">{senderName}</span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Copy text"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditText(currentText);
                  setIsEditing(!isEditing);
                }}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Edit message"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-2 mt-1 min-w-[280px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl bg-dark-950/80 border border-brand-500/50 text-white focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y"
              />
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <MarkdownRenderer content={currentText} className="text-slate-100" />
          )}
        </div>
      </div>
    );
  }

  // ASSISTANT MESSAGE (with in-place regeneration card support)
  return (
    <div className="group relative flex gap-3 px-4 py-3.5 rounded-2xl bg-dark-900/60 border border-white/5 backdrop-blur-md hover:border-white/10 w-full transition-all duration-200">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={senderName}
            className="w-9 h-9 rounded-full object-cover border border-white/10 shadow-md ring-2 ring-black/30"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-purple-900/60 text-purple-200 flex items-center justify-center border border-white/10 shadow-md">
            <Bot className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Header Name */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">{senderName}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
              AI
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Copy message"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePin}
              className={`p-1 rounded hover:bg-white/10 transition-colors ${
                pinned ? "text-amber-400" : "text-slate-400 hover:text-amber-300"
              }`}
              title="Pin to Character Memory Bank"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditText(currentText);
                setIsEditing(!isEditing);
              }}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Edit message"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* In-Place Regeneration Card */}
        {isRegeneratingThis ? (
          <div className="py-2 space-y-2">
            <div className="flex items-center gap-2 text-brand-300 text-xs font-mono animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-brand-400" />
              <span>Thinking of an alternate response...</span>
            </div>
            {regeneratingText ? (
              <MarkdownRenderer content={regeneratingText} />
            ) : (
              <div className="h-12 flex items-center gap-1.5 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>
        ) : isEditing ? (
          <div className="flex flex-col gap-2 mt-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-xl bg-dark-950/80 border border-brand-500/50 text-white focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 text-[11px]">
                ⚠️ Editing will branch context & soft-delete subsequent replies.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <MarkdownRenderer content={currentText} />
        )}

        {/* Swipe Controls */}
        {!isEditing && !isRegeneratingThis && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
            <SwipeControls
              currentIndex={activeIndex}
              totalSwipes={Math.max(swipes.length, 1)}
              onPrev={() => handleSwitchSwipe(activeIndex - 1)}
              onNext={() => handleSwitchSwipe(activeIndex + 1)}
              onRegenerate={() => onRegenerateSwipe(message.id)}
              canRegenerate={isLastAssistant}
              isStreaming={isStreaming}
            />

            {copied && <span className="text-[11px] text-emerald-400">Copied!</span>}
            {pinned && <span className="text-[11px] text-amber-300">Pinned to Memory!</span>}
          </div>
        )}
      </div>
    </div>
  );
};
