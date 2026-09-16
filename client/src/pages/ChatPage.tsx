import React, { useState, useEffect } from "react";
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
} from "../api/baseApi.js";
import { useStreamChat } from "../hooks/useStreamChat.js";
import { Header } from "../components/layout/Header.js";
import { MessageList } from "../components/chat/MessageList.js";
import { ChatInput } from "../components/chat/ChatInput.js";
import { ZenToggleButton } from "../components/chat/ZenToggleButton.js";
import { PinnedMemoriesDrawer } from "../components/memory/PinnedMemoriesDrawer.js";
import { CharacterProfileDrawer } from "../components/characters/CharacterProfileDrawer.js";
import { setMemoryDrawerOpen } from "../store/uiSlice.js";
import { setMaxTokens } from "../store/chatSlice.js";
import { Bot, RefreshCw } from "lucide-react";

export const ChatPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const {
    isStreaming,
    streamingText,
    streamError,
    optimisticUserMessage,
    regeneratingMessageId,
    sendMessage,
    regenerateMessage,
    goOn,
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

  return (
    <div className="relative flex-1 flex flex-col h-screen overflow-hidden bg-dark-950">
      {/* 1. Fullscreen Wallpaper Background with Ambient Halo & Center Portrait Fit */}
      {character.backgroundUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          {/* Ambient blurred fill for widescreen borders */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 transition-all duration-700"
            style={{
              backgroundImage: `url(${character.backgroundUrl})`,
              filter: `blur(${Math.max(character.bgBlur || 0, 16)}px)`,
            }}
          />
          {/* Centered crisp image for vertical/portrait and widescreen artwork */}
          <div
            className="absolute inset-0 bg-contain bg-no-repeat bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${character.backgroundUrl})`,
              filter: character.bgBlur ? `blur(${character.bgBlur}px)` : "none",
            }}
          />
        </div>
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
          onEdit={handleEditMessage}
          onSwitchSwipe={handleSwitchSwipe}
          onRegenerateSwipe={handleRegenerateSwipe}
          onPinMemory={handlePinMemory}
        />

        {/* Input Bar Area */}
        <div className="p-4 sm:p-6 pt-0">
          <ChatInput
            onSendMessage={(txt) => sendMessage(txt, currentMaxTokens)}
            onStopStreaming={stopStreaming}
            onGoOn={() => goOn(currentMaxTokens)}
            hasMessages={messages.length > 0}
            isStreaming={isStreaming}
            isLmStudioConnected={isLmConnected}
            characterName={character.name}
            onSavePreference={handleSaveTokenPreference}
          />
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
