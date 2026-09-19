import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Edit3,
  Check,
  X,
  Bookmark,
  Copy,
  Bot,
  Sparkles,
} from "lucide-react";
import { Message, Character, UserPersona } from "../../api/baseApi.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { SwipeControls } from "./SwipeControls.js";
import { ThinkingIndicator } from "./ThinkingIndicator.js";
import { RootState } from "../../store/store.js";

interface MessageBubbleProps {
  message: Message;
  character: Character;
  userPersona?: UserPersona | null;
  isLastAssistant: boolean;
  isStreaming?: boolean;
  isRegeneratingThis?: boolean;
  regeneratingText?: string;
  isDeleteMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => Promise<void>;
  onSwitchSwipe: (messageId: string, newIndex: number) => Promise<void>;
  onRegenerateSwipe: (messageId: string) => Promise<void>;
  onPinMemory: (content: string) => Promise<void>;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  character,
  userPersona,
  isLastAssistant,
  isStreaming = false,
  isRegeneratingThis = false,
  regeneratingText = "",
  isDeleteMode = false,
  isSelected = false,
  onToggleSelect,
  onEdit,
  onSwitchSwipe,
  onRegenerateSwipe,
  onPinMemory,
}) => {
  const bubbleOpacity = useSelector((state: RootState) => state.chat.bubbleOpacity ?? 70);
  const isAssistant = message.sender === "assistant";
  const swipes = message.swipes || [];

  // Optimistic swipe index for 0ms instant switching between already generated responses
  const [localIndex, setLocalIndex] = useState<number | null>(null);
  const activeIndex = localIndex !== null ? localIndex : (message.activeSwipeIndex ?? 0);
  const currentText = swipes[activeIndex] ?? (swipes[0] || "");

  useEffect(() => {
    setLocalIndex(null);
  }, [message.activeSwipeIndex]);

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
    if (newIndex < 0 || newIndex >= swipes.length) return;
    if (!isLastAssistant) {
      const confirmSwitch = window.confirm(
        "Notice: Switching an earlier response branches the conversation context. Subsequent replies may not match this new variant. Continue?"
      );
      if (!confirmSwitch) return;
    }
    // Instantly update text in-place with zero latency
    setLocalIndex(newIndex);
    try {
      await onSwitchSwipe(message.id, newIndex);
    } catch (err) {
      console.error("Failed to switch swipe:", err);
      setLocalIndex(null);
    }
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

  // Smooth Hardware-Accelerated Swipe Physics
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingOffsetRef = useRef<number>(0);

  const canSwipeLeft = !isStreaming && !isEditing && !isDeleteMode && (activeIndex < swipes.length - 1 || isLastAssistant);
  const canSwipeRight = !isStreaming && !isEditing && !isDeleteMode && activeIndex > 0;

  const updateDragOffset = (val: number) => {
    pendingOffsetRef.current = val;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setDragOffset(pendingOffsetRef.current);
        rafRef.current = null;
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAssistant || isEditing || isStreaming || isRegeneratingThis || isDeleteMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, pre, code, [role='button']")) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isHorizontalSwipeRef.current = true;
          setIsDragging(true);
        } else {
          isHorizontalSwipeRef.current = false;
        }
      }
    }

    if (isHorizontalSwipeRef.current) {
      if (e.cancelable) {
        e.preventDefault();
      }
      let effective = deltaX;
      if (deltaX > 0 && !canSwipeRight) {
        effective = deltaX * 0.15;
      } else if (deltaX < 0 && !canSwipeLeft) {
        effective = deltaX * 0.15;
      } else {
        effective = deltaX * 0.75;
      }
      updateDragOffset(Math.max(-85, Math.min(85, effective)));
    }
  };

  const handleTouchEnd = async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const hadSwipe = isHorizontalSwipeRef.current;
    const offset = pendingOffsetRef.current;

    touchStartRef.current = null;
    isHorizontalSwipeRef.current = null;
    pendingOffsetRef.current = 0;
    setIsDragging(false);
    setDragOffset(0);

    if (!hadSwipe) return;

    const SWIPE_THRESHOLD = 38;

    if (offset < -SWIPE_THRESHOLD && canSwipeLeft) {
      if (activeIndex < swipes.length - 1) {
        await handleSwitchSwipe(activeIndex + 1);
      } else if (isLastAssistant) {
        await onRegenerateSwipe(message.id);
      }
    } else if (offset > SWIPE_THRESHOLD && canSwipeRight) {
      await handleSwitchSwipe(activeIndex - 1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isAssistant || isEditing || isStreaming || isRegeneratingThis || isDeleteMode) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, pre, code, [role='button']")) return;

    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    if (!isDragging && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setIsDragging(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        } catch {}
      } else {
        pointerStartRef.current = null;
        return;
      }
    }

    if (isDragging) {
      let effective = deltaX;
      if (deltaX > 0 && !canSwipeRight) {
        effective = deltaX * 0.15;
      } else if (deltaX < 0 && !canSwipeLeft) {
        effective = deltaX * 0.15;
      } else {
        effective = deltaX * 0.75;
      }
      updateDragOffset(Math.max(-85, Math.min(85, effective)));
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    pointerStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (isDragging) {
      const offset = pendingOffsetRef.current;
      pendingOffsetRef.current = 0;
      setIsDragging(false);
      setDragOffset(0);

      const SWIPE_THRESHOLD = 38;

      if (offset < -SWIPE_THRESHOLD && canSwipeLeft) {
        if (activeIndex < swipes.length - 1) {
          await handleSwitchSwipe(activeIndex + 1);
        } else if (isLastAssistant) {
          await onRegenerateSwipe(message.id);
        }
      } else if (offset > SWIPE_THRESHOLD && canSwipeRight) {
        await handleSwitchSwipe(activeIndex - 1);
      }
    }
  };

  const avatarUrl = isAssistant
    ? character.avatarUrl
    : userPersona?.avatarUrl;
  const senderName = isAssistant ? character.name : (userPersona?.name || "You");

  // Dynamic Opacity Styles
  const userBubbleStyle: React.CSSProperties = bubbleOpacity === 0
    ? {
        backgroundColor: "transparent",
        borderColor: "transparent",
        backdropFilter: "none",
        boxShadow: "none",
      }
    : {
        backgroundColor: `rgba(45, 16, 82, ${(bubbleOpacity / 100) * 0.75})`,
        borderColor: `rgba(168, 85, 247, ${(bubbleOpacity / 100) * 0.35})`,
        backdropFilter: bubbleOpacity > 15 ? "blur(10px)" : "none",
      };

  const assistantBubbleStyle: React.CSSProperties = {
    ...(bubbleOpacity === 0
      ? {
          backgroundColor: "transparent",
          borderColor: "transparent",
          backdropFilter: "none",
          boxShadow: "none",
        }
      : {
          backgroundColor: `rgba(15, 17, 23, ${(bubbleOpacity / 100) * 0.65})`,
          borderColor: `rgba(255, 255, 255, ${(bubbleOpacity / 100) * 0.08})`,
          backdropFilter: bubbleOpacity > 15 ? "blur(10px)" : "none",
        }),
    transform: `translateX(${dragOffset}px)`,
    transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
    willChange: "transform",
    touchAction: "pan-y",
  };

  const textContrastClass = bubbleOpacity < 35 ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]" : "";

  // USER MESSAGE: Compressed & compact
  if (!isAssistant) {
    return (
      <div
        data-testid="message-bubble"
        className={`flex justify-end items-center w-full animate-in fade-in duration-150 gap-2 ${
          isDeleteMode ? "cursor-pointer" : ""
        }`}
        onClick={isDeleteMode ? () => onToggleSelect?.(message.id) : undefined}
      >
        {/* Delete Mode Checkbox */}
        {isDeleteMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(message.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-0 cursor-pointer accent-brand-500 flex-shrink-0"
          />
        )}

        <div
          style={userBubbleStyle}
          className={`group relative w-fit max-w-[85%] sm:max-w-[78%] border px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all ${
            isSelected ? "ring-2 ring-red-500/80" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold text-[11px] text-brand-300 ${textContrastClass}`}>
                {senderName}
              </span>
            </div>

            {/* Quick Actions */}
            {!isDeleteMode && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                  className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Edit message"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-1.5 mt-1 w-full min-w-[260px] sm:min-w-[500px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="w-full min-h-[120px] px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-dark-950/90 border border-brand-500/50 text-white focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y"
              />
              <div className="flex items-center justify-end gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 hover:bg-dark-700 text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-2.5 py-0.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white font-medium text-[11px] shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className={textContrastClass}>
              <MarkdownRenderer content={currentText} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ASSISTANT MESSAGE: Compressed & compact bubble
  return (
    <div
      data-testid="message-bubble"
      className={`flex items-start gap-2.5 w-full animate-in fade-in duration-150 relative ${
        isDeleteMode ? "cursor-pointer" : ""
      }`}
      onClick={isDeleteMode ? () => onToggleSelect?.(message.id) : undefined}
    >
      {/* Delete Mode Checkbox */}
      {isDeleteMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(message.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-0 cursor-pointer accent-brand-500 flex-shrink-0"
        />
      )}

      <div
        style={assistantBubbleStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`group relative flex items-start gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border w-fit max-w-[88%] sm:max-w-[82%] select-none ${
          isSelected ? "ring-2 ring-red-500/80" : ""
        } ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
      >
        {/* Compact Avatar */}
        <div className="flex-shrink-0 mt-0.5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={senderName}
            loading="lazy"
            decoding="async"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 shadow-sm ring-1 ring-black/30"
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-900/60 text-purple-200 flex items-center justify-center border border-white/10 shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Header Name */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold text-xs sm:text-[13px] text-slate-100 ${textContrastClass}`}>
              {senderName}
            </span>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
              AI
            </span>
          </div>

          {/* Action Toolbar */}
          {!isDeleteMode && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Copy message"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handlePin}
                className={`p-1 rounded hover:bg-white/10 transition-colors ${
                  pinned ? "text-amber-400" : "text-slate-400 hover:text-amber-300"
                }`}
                title="Pin to Character Memory Bank"
              >
                <Bookmark className="w-3 h-3" />
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
          )}
        </div>

        {/* In-Place Regeneration Card */}
        {isRegeneratingThis ? (
          <div className="py-1 space-y-1.5">
            {regeneratingText ? (
              <div className={textContrastClass}>
                <MarkdownRenderer content={regeneratingText} />
              </div>
            ) : (
              <ThinkingIndicator />
            )}
          </div>
        ) : isEditing ? (
          <div className="flex flex-col gap-1.5 mt-1 w-full min-w-[260px] sm:min-w-[500px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="w-full min-h-[120px] px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-dark-950/90 border border-brand-500/50 text-white focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y"
            />
            <div className="flex items-center justify-end gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2 py-0.5 rounded-md bg-dark-800 hover:bg-dark-700 text-slate-300 flex items-center gap-1 transition-colors text-[11px]"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-2.5 py-0.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center gap-1 transition-colors shadow-sm text-[11px]"
              >
                <Check className="w-3 h-3" /> Save
              </button>
            </div>
          </div>
        ) : (
          <div className={textContrastClass}>
            <MarkdownRenderer content={currentText} />
          </div>
        )}

        {/* Swipe Controls */}
        {!isEditing && !isRegeneratingThis && !isDeleteMode && (
          <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-white/5">
            <SwipeControls
              currentIndex={activeIndex}
              totalSwipes={Math.max(swipes.length, 1)}
              onPrev={() => handleSwitchSwipe(activeIndex - 1)}
              onNext={() => handleSwitchSwipe(activeIndex + 1)}
              onRegenerate={() => onRegenerateSwipe(message.id)}
              canRegenerate={isLastAssistant}
              isStreaming={isStreaming}
            />

            {copied && <span className="text-[10px] text-emerald-400">Copied!</span>}
            {pinned && <span className="text-[10px] text-amber-300">Pinned to Memory!</span>}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export const MessageBubble = React.memo(
  MessageBubbleComponent,
  (prevProps, nextProps) => {
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.message.activeSwipeIndex !== nextProps.message.activeSwipeIndex) return false;
    if (prevProps.message.swipes?.length !== nextProps.message.swipes?.length) return false;
    const prevContent = prevProps.message.swipes?.[prevProps.message.activeSwipeIndex];
    const nextContent = nextProps.message.swipes?.[nextProps.message.activeSwipeIndex];
    if (prevContent !== nextContent) return false;
    if (prevProps.isLastAssistant !== nextProps.isLastAssistant) return false;
    if (prevProps.isDeleteMode !== nextProps.isDeleteMode) return false;
    if (prevProps.isSelected !== nextProps.isSelected) return false;
    if (prevProps.isRegeneratingThis !== nextProps.isRegeneratingThis) return false;
    if (prevProps.regeneratingText !== nextProps.regeneratingText) return false;
    if (prevProps.character.avatarUrl !== nextProps.character.avatarUrl) return false;
    if (prevProps.character.name !== nextProps.character.name) return false;
    if (prevProps.userPersona?.name !== nextProps.userPersona?.name) return false;
    return true;
  }
);
MessageBubble.displayName = "MessageBubble";
