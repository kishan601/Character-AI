import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store.js";
import {
  useGetSessionQuery,
  useEditMessageMutation,
  useSwitchSwipeMutation,
  usePinMemoryMutation,
  useUnpinMemoryMutation,
  useUpdateSessionMutation,
  useGetHealthQuery,
  useBatchDeleteMessagesMutation,
} from "../api/baseApi.js";
import { useStreamChat } from "../hooks/useStreamChat.js";
import { Header } from "../components/layout/Header.js";
import { MessageList } from "../components/chat/MessageList.js";
import { ChatInput } from "../components/chat/ChatInput.js";
import { ZenToggleButton } from "../components/chat/ZenToggleButton.js";
import { PinnedMemoriesDrawer } from "../components/memory/PinnedMemoriesDrawer.js";
import { CharacterProfileDrawer } from "../components/characters/CharacterProfileDrawer.js";
import { setMemoryDrawerOpen, setSidebarOpen } from "../store/uiSlice.js";
import { setMaxTokens } from "../store/chatSlice.js";
import { Bot, RefreshCw, Trash2 } from "lucide-react";

export const ChatPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      dispatch(setSidebarOpen(false));
    }
  }, [sessionId, dispatch]);

  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const zenMode = useSelector((state: RootState) => state.ui.zenMode);
  const memoryDrawerOpen = useSelector((state: RootState) => state.ui.memoryDrawerOpen);
  const currentMaxTokens = useSelector((state: RootState) => state.chat.currentMaxTokens);

  const {
    data: session,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetSessionQuery(sessionId || "", {
    skip: !sessionId,
  });

  const { data: health } = useGetHealthQuery();
  const isLmConnected = Boolean(health?.connected);

  const [editMessage] = useEditMessageMutation();
  const [switchSwipe] = useSwitchSwipeMutation();
  const [pinMemory] = usePinMemoryMutation();
  const [unpinMemory] = useUnpinMemoryMutation();
  const [updateSession] = useUpdateSessionMutation();
  const [batchDeleteMessages, { isLoading: isDeletingMessages }] = useBatchDeleteMessagesMutation();

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const {
    isStreaming,
    streamingText,
    streamError,
    optimisticUserMessage,
    regeneratingMessageId,
    sendMessage,
    goOn,
    regenerateMessage,
    stopStreaming,
  } = useStreamChat({
    sessionId: sessionId || "",
  });

  // Sync token preference from session if available
  useEffect(() => {
    if (session?.preferredMaxTokens && session.preferredMaxTokens !== currentMaxTokens) {
      dispatch(setMaxTokens(session.preferredMaxTokens));
    }
  }, [session?.preferredMaxTokens, dispatch]);

  const handleSaveTokenPreference = async (tokens: number) => {
    if (!session?.id) return;
    try {
      await updateSession({
        id: session.id,
        data: { preferredMaxTokens: tokens },
      }).unwrap();
    } catch (err) {
      console.error("Failed to persist token preference:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-dark-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Entering conversation...</span>
        </div>
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-dark-950 text-slate-300 p-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4 text-brand-400">
          <Bot className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connecting to Session...</h2>
        <p className="text-sm text-slate-400 max-w-sm text-center mb-6">
          Unable to load conversation or network connection interrupted.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-5 py-2.5 rounded-2xl bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold text-xs border border-white/10 transition-all"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  const { character, userPersona, messages = [], memories = [] } = session;

  const handleEditMessage = async (messageId: string, newContent: string) => {
    await editMessage({ id: messageId, content: newContent }).unwrap();
  };

  const handleSwitchSwipe = async (messageId: string, newIndex: number) => {
    await switchSwipe({ id: messageId, swipeIndex: newIndex }).unwrap();
  };

  const handleRegenerateSwipe = async (messageId: string) => {
    await regenerateMessage(messageId, currentMaxTokens);
  };

  // Latest assistant message for desktop keyboard swipe navigation (< > / ArrowLeft ArrowRight)
  const latestAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((m) => m.sender === "assistant");
  }, [messages]);

  const handlePrevSwipe = useCallback(() => {
    if (!latestAssistantMessage || isStreaming) return;
    const currentIdx = latestAssistantMessage.activeSwipeIndex ?? 0;
    if (currentIdx > 0) {
      handleSwitchSwipe(latestAssistantMessage.id, currentIdx - 1);
    }
  }, [latestAssistantMessage, isStreaming]);

  const handleNextSwipe = useCallback(() => {
    if (!latestAssistantMessage || isStreaming) return;
    const currentIdx = latestAssistantMessage.activeSwipeIndex ?? 0;
    const totalSwipes = latestAssistantMessage.swipes?.length ?? 1;
    if (currentIdx < totalSwipes - 1) {
      handleSwitchSwipe(latestAssistantMessage.id, currentIdx + 1);
    } else {
      handleRegenerateSwipe(latestAssistantMessage.id);
    }
  }, [latestAssistantMessage, isStreaming]);

  // Global keyboard listener for < > and ArrowLeft / ArrowRight desktop navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isDeleteMode || isProfileDrawerOpen) return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea";

      // If user is actively typing text inside input/textarea, require Alt key
      if (isInput) {
        const target = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
        if (target.value?.trim() && !e.altKey) {
          return;
        }
      }

      if (e.key === "ArrowLeft" || e.key === "<" || (e.altKey && e.key === ",")) {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          handlePrevSwipe();
        }
      } else if (e.key === "ArrowRight" || e.key === ">" || (e.altKey && e.key === ".")) {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          handleNextSwipe();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handlePrevSwipe, handleNextSwipe, isDeleteMode, isProfileDrawerOpen]);

  const handlePinMemory = async (content: string, label?: string) => {
    await pinMemory({
      characterId: character.id,
      sessionId: session.id,
      content,
      label,
    }).unwrap();
  };

  const handleDeleteMemory = async (memoryId: string) => {
    await unpinMemory(memoryId).unwrap();
  };

  const handleToggleSelectMessage = (messageId: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSelectAllMessages = () => {
    if (selectedMessageIds.size === messages.length) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(messages.map((m) => m.id)));
    }
  };

  const handleConfirmDeleteMessages = async () => {
    if (selectedMessageIds.size === 0) return;
    const count = selectedMessageIds.size;
    const confirmed = window.confirm(`Permanently delete ${count} selected message${count > 1 ? "s" : ""}?`);
    if (!confirmed) return;

    try {
      await batchDeleteMessages({
        sessionId: session.id,
        messageIds: Array.from(selectedMessageIds),
      }).unwrap();
      setIsDeleteMode(false);
      setSelectedMessageIds(new Set());
    } catch (err) {
      console.error("Failed to delete messages:", err);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-dark-950">
      {/* 1. Fullscreen Wallpaper Background (Fills entire screen on all devices) */}
      {character.backgroundUrl && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none select-none"
          style={{
            backgroundImage: `url(${character.backgroundUrl})`,
            filter: character.bgBlur ? `blur(${character.bgBlur}px)` : "none",
          }}
        />
      )}

      {/* Dimming Overlay */}
      <div
        className="absolute inset-0 z-0 transition-opacity duration-500 pointer-events-none"
        style={{
          backgroundColor: `rgba(9, 10, 15, ${(character.bgDim ?? 40) / 100})`,
        }}
      />

      {/* Top-Right Floating Zen Mode Exit Button (Only when Header is hidden in Zen Mode) */}
      {zenMode && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in duration-300">
          <ZenToggleButton />
        </div>
      )}

      {/* 3. Header Bar with Seamless Soft Refresh and Character Drawer Trigger */}
      <Header
        character={character}
        userPersona={userPersona}
        memoriesCount={memories.length}
        showChatControls={true}
        onRefreshChat={() => refetch()}
        isRefreshing={isFetching}
        onOpenCharacterProfile={() => setIsProfileDrawerOpen(true)}
        onToggleDeleteMode={() => {
          setIsDeleteMode((prev) => !prev);
          setSelectedMessageIds(new Set());
        }}
        isDeleteMode={isDeleteMode}
      />

      {/* 4. Main Chat View (fades out smoothly in Zen Mode) */}
      <div
        className={`relative z-10 flex-1 flex flex-col overflow-hidden transition-all duration-500 ${
          zenMode
            ? "opacity-0 pointer-events-none scale-95"
            : "opacity-100 pointer-events-auto scale-100"
        }`}
      >
        {/* Messages Feed */}
        <MessageList
          messages={messages}
          character={character}
          userPersona={userPersona}
          streamingText={streamingText}
          isStreaming={isStreaming}
          optimisticUserMessage={optimisticUserMessage}
          regeneratingMessageId={regeneratingMessageId}
          isDeleteMode={isDeleteMode}
          selectedMessageIds={selectedMessageIds}
          onToggleSelect={handleToggleSelectMessage}
          onEdit={handleEditMessage}
          onSwitchSwipe={handleSwitchSwipe}
          onRegenerateSwipe={handleRegenerateSwipe}
          onPinMemory={handlePinMemory}
        />

        {/* Input Bar or Floating Delete Action Bar */}
        <div className="p-2 sm:p-4 pt-0 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          {isDeleteMode ? (
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-dark-900/95 border border-red-500/40 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllMessages}
                  className="text-xs font-semibold text-brand-300 hover:text-brand-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-dark-800 border border-white/10 transition-colors"
                >
                  {selectedMessageIds.size === messages.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs text-slate-300 font-medium">
                  {selectedMessageIds.size} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteMode(false);
                    setSelectedMessageIds(new Set());
                  }}
                  className="px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-dark-800 text-slate-300 hover:bg-dark-700 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMessages}
                  disabled={selectedMessageIds.size === 0 || isDeletingMessages}
                  className="px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-red-500/25 flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingMessages ? "Deleting..." : "Delete"}</span>
                </button>
              </div>
            </div>
          ) : (
            <ChatInput
              onSendMessage={(txt) => sendMessage(txt, currentMaxTokens)}
              onGoOn={() => goOn(currentMaxTokens)}
              onStopStreaming={stopStreaming}
              isStreaming={isStreaming}
              isLmStudioConnected={isLmConnected}
              characterName={character.name}
              onSavePreference={handleSaveTokenPreference}
              onPrevSwipe={handlePrevSwipe}
              onNextSwipe={handleNextSwipe}
            />
          )}
        </div>
      </div>

      {/* 5. Drawers and Modals */}
      <PinnedMemoriesDrawer
        isOpen={memoryDrawerOpen}
        onClose={() => dispatch(setMemoryDrawerOpen(false))}
        memories={memories}
        characterName={character.name}
        onAddMemory={handlePinMemory}
        onDeleteMemory={handleDeleteMemory}
      />

      <CharacterProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        character={character}
        activeSessionId={session.id}
      />
    </div>
  );
};
