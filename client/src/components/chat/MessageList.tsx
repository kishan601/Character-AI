import React, { useEffect, useRef } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useSelector } from "react-redux";
import { Message, Character, UserPersona } from "../../api/baseApi.js";
import { MessageBubble } from "./MessageBubble.js";
import { StreamingMessage } from "./StreamingMessage.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { Bot, Sparkles } from "lucide-react";
import { RootState } from "../../store/store.js";

interface MessageListProps {
  messages: Message[];
  character: Character;
  userPersona?: UserPersona | null;
  streamingText: string;
  isStreaming: boolean;
  optimisticUserMessage?: string | null;
  regeneratingMessageId?: string | null;
  isDeleteMode?: boolean;
  selectedMessageIds?: Set<string>;
  onToggleSelect?: (messageId: string) => void;
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
  isDeleteMode = false,
  selectedMessageIds,
  onToggleSelect,
  onEdit,
  onSwitchSwipe,
  onRegenerateSwipe,
  onPinMemory,
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const bubbleOpacity = useSelector((state: RootState) => state.chat.bubbleOpacity ?? 70);

  const userBubbleStyle: React.CSSProperties = bubbleOpacity === 0
    ? {
        backgroundColor: "transparent",
        borderColor: "transparent",
        boxShadow: "none",
      }
    : {
        backgroundColor: `rgba(45, 16, 82, ${(bubbleOpacity / 100) * 0.85})`,
        borderColor: `rgba(168, 85, 247, ${(bubbleOpacity / 100) * 0.4})`,
      };

  const assistantBubbleStyle: React.CSSProperties = bubbleOpacity === 0
    ? {
        backgroundColor: "transparent",
        borderColor: "transparent",
        boxShadow: "none",
      }
    : {
        backgroundColor: `rgba(15, 17, 23, ${(bubbleOpacity / 100) * 0.85})`,
        borderColor: `rgba(255, 255, 255, ${(bubbleOpacity / 100) * 0.1})`,
      };

  const textContrastClass = bubbleOpacity < 35 ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]" : "";

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="flex-1 max-w-4xl mx-auto w-full"
      style={{ overflowY: "auto" }}
      data={messages}
      initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
      followOutput="smooth"
      components={{
        List: React.forwardRef<HTMLDivElement, any>(({ style, children }, ref) => (
          <div ref={ref} style={style} className="px-3 sm:px-4 py-3 sm:py-4">
            {children}
          </div>
        )),
        Item: ({ children, ...props }: any) => (
          <div className="mb-2 sm:mb-2.5" {...props}>
            {children}
          </div>
        ),
        Header: () => (
          <div className="flex flex-col items-center text-center py-4 sm:py-5 px-3 sm:px-4 rounded-2xl sm:rounded-3xl bg-dark-900/40 border border-white/5 backdrop-blur-md mb-3 sm:mb-4 mx-3 sm:mx-4 mt-3 sm:mt-4">
            {character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt={character.name}
                loading="lazy"
                decoding="async"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-brand-500/40 shadow-xl mb-2 ring-2 ring-black/40"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-900/50 flex items-center justify-center border-2 border-brand-500/30 text-brand-300 shadow-xl mb-2">
                <Bot className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            )}
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{character.name}</h2>
            {character.tagline && (
              <p className="text-xs text-brand-300 font-medium mt-0.5">{character.tagline}</p>
            )}
          </div>
        ),
        Footer: () => (
          <div className="mx-3 sm:mx-4">
            {/* Optimistic User Message */}
            {optimisticUserMessage && (
              <div className="flex justify-end w-full animate-in fade-in slide-in-from-bottom-2 duration-150 mb-2 sm:mb-2.5">
                <div
                  style={userBubbleStyle}
                  className="w-fit max-w-[85%] sm:max-w-[78%] border px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-lg"
                >
                  <span className={`font-semibold text-[11px] text-brand-300 block mb-0.5 ${textContrastClass}`}>
                    {userPersona?.name || "You"}
                  </span>
                  <div className={textContrastClass}>
                    <MarkdownRenderer content={optimisticUserMessage} />
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Streaming Bubble */}
            {isStreaming && !regeneratingMessageId && (
              <StreamingMessage
                character={character}
                streamingText={streamingText}
                assistantBubbleStyle={assistantBubbleStyle}
                textContrastClass={textContrastClass}
              />
            )}
            <div className="h-2" />
          </div>
        ),
      }}
      itemContent={(idx, msg) => {
        const isLastAssistant = msg.sender === "assistant" && idx === messages.length - 1;
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
            isDeleteMode={isDeleteMode}
            isSelected={selectedMessageIds?.has(msg.id)}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onSwitchSwipe={onSwitchSwipe}
            onRegenerateSwipe={onRegenerateSwipe}
            onPinMemory={onPinMemory}
          />
        );
      }}
    />
  );
};
