import React, { useEffect, useRef } from "react";
import { Message, Character, UserPersona } from "../../api/baseApi.js";
import { MessageBubble } from "./MessageBubble.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { Bot, Sparkles } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  character: Character;
  userPersona?: UserPersona | null;
  streamingText: string;
  isStreaming: boolean;
  optimisticUserMessage?: string | null;
  regeneratingMessageId?: string | null;
  onEdit: (messageId: string, newContent: string) => Promise<void>;
  onSwitchSwipe: (messageId: string, newIndex: number) => Promise<void>;
  onRegenerateSwipe: (messageId: string) => Promise<void>;
  onPinMemory: (content: string) => Promise<void>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  character,
  userPersona,
  streamingText,
  isStreaming,
  optimisticUserMessage,
  regeneratingMessageId,
  onEdit,
  onSwitchSwipe,
  onRegenerateSwipe,
  onPinMemory,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message, optimistic insertion, or during streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, isStreaming, optimisticUserMessage]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-4xl mx-auto w-full">
      {/* Welcome Header */}
      {messages.length <= 1 && (
        <div className="flex flex-col items-center text-center py-6 px-4 rounded-3xl bg-dark-900/40 border border-white/5 backdrop-blur-md mb-6">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-brand-500/40 shadow-xl mb-3 ring-4 ring-black/40"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-brand-900/50 flex items-center justify-center border-2 border-brand-500/30 text-brand-300 shadow-xl mb-3">
              <Bot className="w-10 h-10" />
            </div>
          )}
          <h2 className="text-xl font-bold text-white tracking-tight">{character.name}</h2>
          {character.tagline && (
            <p className="text-sm text-brand-300 font-medium mt-1">{character.tagline}</p>
          )}
          {character.description && (
            <p className="text-xs text-slate-400 max-w-md mt-2 line-clamp-3">
              {character.description}
            </p>
          )}
        </div>
      )}

      {/* Existing Messages Feed */}
      {messages.map((msg, idx) => {
        const isLastAssistant =
          msg.sender === "assistant" && idx === messages.length - 1;
        const isRegenThis = regeneratingMessageId === msg.id;

        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            character={character}
            userPersona={userPersona}
            isLastAssistant={isLastAssistant}
            isStreaming={isStreaming}
            isRegeneratingThis={isRegenThis}
            regeneratingText={isRegenThis ? streamingText : ""}
            onEdit={onEdit}
            onSwitchSwipe={onSwitchSwipe}
            onRegenerateSwipe={onRegenerateSwipe}
            onPinMemory={onPinMemory}
          />
        );
      })}

      {/* Optimistic User Message (Shown INSTANTLY on hitting send) */}
      {optimisticUserMessage && (
        <div className="flex justify-end w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="w-fit max-w-[78%] bg-brand-950/70 border border-brand-500/35 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg">
            <span className="font-semibold text-xs text-brand-300 block mb-1">
              {userPersona?.name || "You"}
            </span>
            <MarkdownRenderer content={optimisticUserMessage} className="text-slate-100" />
          </div>
        </div>
      )}

      {/* Real-time Streaming Bubble for NEW turn (only when not regenerating an existing message in-place) */}
      {isStreaming && !regeneratingMessageId && (
        <div className="flex gap-3 px-4 py-3.5 rounded-2xl bg-dark-900/70 border border-brand-500/20 backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex-shrink-0 mt-0.5">
            {character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="w-9 h-9 rounded-full object-cover border border-white/10 shadow-md ring-2 ring-brand-500/30 animate-pulse"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-900/60 flex items-center justify-center text-brand-300 border border-white/10 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-semibold text-sm text-slate-100">{character.name}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 animate-spin" /> Generating...
              </span>
            </div>
            {streamingText ? (
              <MarkdownRenderer content={streamingText} />
            ) : (
              <div className="flex items-center gap-1.5 py-2 text-slate-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-mono text-[11px] text-brand-300">Formulating response...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-2" />
    </div>
  );
};
