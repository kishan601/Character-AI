import { useState, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { baseApi } from "../api/baseApi.js";
import { getApiBaseUrl } from "../config";
import { AppDispatch } from "../store/store.js";

interface UseStreamChatOptions {
  sessionId: string;
  onDone?: () => void;
}

const getAiConfig = () => ({
  aiProvider: localStorage.getItem("ai_provider") || "Custom",
  aiEndpoint: localStorage.getItem("ai_endpoint") || "http://192.168.29.240:1234/v1/chat/completions",
  aiApiKey: localStorage.getItem("ai_api_key") || "",
  aiModel: localStorage.getItem("ai_model") || "liquid/lfm2.5-1.2b"
});

export function useStreamChat({ sessionId, onDone }: UseStreamChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const tokenBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  const flushTokenBuffer = useCallback(() => {
    if (tokenBufferRef.current) {
      const textToAppend = tokenBufferRef.current;
      tokenBufferRef.current = "";
      setStreamingText((prev) => prev + textToAppend);
    }
    rafIdRef.current = null;
  }, []);

  const queueToken = useCallback(
    (token: string) => {
      tokenBufferRef.current += token;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushTokenBuffer);
      }
    },
    [flushTokenBuffer]
  );

  const clearTokenBatcher = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    tokenBufferRef.current = "";
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTokenBatcher();
    setIsStreaming(false);
    setStreamingText("");
    setRegeneratingMessageId(null);
    setOptimisticUserMessage(null);
  }, [clearTokenBatcher]);

  const sendMessage = useCallback(
    async (userText: string, maxTokens?: number) => {
      if (!userText.trim() || isStreaming) return;

      // 1. Immediately display user message optimistically (Zero Lag!)
      setOptimisticUserMessage(userText.trim());
      clearTokenBatcher();
      setIsStreaming(true);
      setStreamingText("");
      setStreamError(null);
      setRegeneratingMessageId(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(`${getApiBaseUrl()}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            userMessage: userText.trim(),
            maxTokens,
            aiConfig: getAiConfig(),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Generation failed (${response.status}): ${errText}`);
        }

        if (!response.body) {
          throw new Error("No readable stream received.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "user_message" && data.message) {
                // Instantly commit user message to RTK cache & clear optimistic placeholder
                dispatch(
                  baseApi.util.updateQueryData("getSession", sessionId, (draft) => {
                    if (!draft.messages) draft.messages = [];
                    const exists = draft.messages.some((m) => m.id === data.message.id);
                    if (!exists) {
                      draft.messages.push(data.message);
                    }
                  })
                );
                setOptimisticUserMessage(null);
              } else if (data.type === "token") {
                queueToken(data.token);
              } else if (data.type === "done") {
                clearTokenBatcher();
                // Seamless handoff: Commit messages into cache FIRST before clearing streaming state
                if (data.message) {
                  dispatch(
                    baseApi.util.updateQueryData("getSession", sessionId, (draft) => {
                      if (!draft.messages) draft.messages = [];
                      if (data.userMessage) {
                        const existsUser = draft.messages.some((m) => m.id === data.userMessage.id);
                        if (!existsUser) {
                          draft.messages.push(data.userMessage);
                        }
                      }
                      const existsAssistant = draft.messages.some((m) => m.id === data.message.id);
                      if (!existsAssistant) {
                        draft.messages.push(data.message);
                      } else {
                        const idx = draft.messages.findIndex((m) => m.id === data.message.id);
                        draft.messages[idx] = data.message;
                      }
                    })
                  );
                }
                setIsStreaming(false);
                setStreamingText("");
                setOptimisticUserMessage(null);
                onDone?.();
                return;
              } else if (data.type === "error") {
                clearTokenBatcher();
                setStreamError(data.error);
                setIsStreaming(false);
                setOptimisticUserMessage(null);
                return;
              }
            } catch {
              // Ignore boundary parse errors
            }
          }
        }
      } catch (err: any) {
        clearTokenBatcher();
        if (err.name === "AbortError") {
          console.log("Chat stream aborted by user.");
        } else {
          setStreamError(err.message || "Failed to stream chat.");
        }
      } finally {
        clearTokenBatcher();
        setIsStreaming(false);
        setStreamingText("");
        setOptimisticUserMessage(null);
        abortControllerRef.current = null;
      }
    },
    [sessionId, isStreaming, dispatch, onDone, queueToken, clearTokenBatcher]
  );

  const goOn = useCallback(
    async (maxTokens?: number) => {
      if (isStreaming) return;

      clearTokenBatcher();
      setIsStreaming(true);
      setStreamingText("");
      setStreamError(null);
      setOptimisticUserMessage(null);
      setRegeneratingMessageId(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(`${getApiBaseUrl()}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            goOn: true,
            maxTokens,
            aiConfig: getAiConfig(),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Continue failed (${response.status}): ${errText}`);
        }

        if (!response.body) {
          throw new Error("No readable stream received.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "token") {
                queueToken(data.token);
              } else if (data.type === "done") {
                clearTokenBatcher();
                // Seamless handoff: Commit assistant message into cache FIRST
                if (data.message) {
                  dispatch(
                    baseApi.util.updateQueryData("getSession", sessionId, (draft) => {
                      if (!draft.messages) draft.messages = [];
                      const exists = draft.messages.some((m) => m.id === data.message.id);
                      if (!exists) {
                        draft.messages.push(data.message);
                      } else {
                        const idx = draft.messages.findIndex((m) => m.id === data.message.id);
                        draft.messages[idx] = data.message;
                      }
                    })
                  );
                }
                setIsStreaming(false);
                setStreamingText("");
                onDone?.();
                return;
              } else if (data.type === "error") {
                clearTokenBatcher();
                setStreamError(data.error);
                setIsStreaming(false);
                return;
              }
            } catch {
              // Ignore boundary errors
            }
          }
        }
      } catch (err: any) {
        clearTokenBatcher();
        if (err.name === "AbortError") {
          console.log("Chat continuation stream aborted by user.");
        } else {
          setStreamError(err.message || "Failed to continue story.");
        }
      } finally {
        clearTokenBatcher();
        setIsStreaming(false);
        setStreamingText("");
        abortControllerRef.current = null;
      }
    },
    [sessionId, isStreaming, dispatch, onDone, queueToken, clearTokenBatcher]
  );

  const regenerateMessage = useCallback(
    async (messageId: string, maxTokens?: number) => {
      if (isStreaming) return;

      // Mark the exact message being regenerated for in-place reload card
      setRegeneratingMessageId(messageId);
      clearTokenBatcher();
      setIsStreaming(true);
      setStreamingText("");
      setStreamError(null);
      setOptimisticUserMessage(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(`${getApiBaseUrl()}/generate/regenerate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            messageId,
            maxTokens,
            aiConfig: getAiConfig(),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Regeneration failed (${response.status}): ${errText}`);
        }

        if (!response.body) {
          throw new Error("No readable stream received.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, "");
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "token") {
                queueToken(data.token);
              } else if (data.type === "done") {
                clearTokenBatcher();
                // Seamless in-place swipe update in cache FIRST
                if (data.message) {
                  dispatch(
                    baseApi.util.updateQueryData("getSession", sessionId, (draft) => {
                      if (draft.messages) {
                        const idx = draft.messages.findIndex((m) => m.id === data.message.id);
                        if (idx !== -1) {
                          draft.messages[idx] = data.message;
                        }
                      }
                    })
                  );
                }
                setIsStreaming(false);
                setStreamingText("");
                setRegeneratingMessageId(null);
                onDone?.();
                return;
              } else if (data.type === "error") {
                clearTokenBatcher();
                setStreamError(data.error);
                setIsStreaming(false);
                setRegeneratingMessageId(null);
                return;
              }
            } catch {
              // Ignore boundary errors
            }
          }
        }
      } catch (err: any) {
        clearTokenBatcher();
        if (err.name === "AbortError") {
          console.log("Regeneration stream aborted.");
        } else {
          setStreamError(err.message || "Failed to regenerate.");
        }
      } finally {
        clearTokenBatcher();
        setIsStreaming(false);
        setStreamingText("");
        setRegeneratingMessageId(null);
        abortControllerRef.current = null;
      }
    },
    [sessionId, isStreaming, dispatch, onDone, queueToken, clearTokenBatcher]
  );

  return {
    isStreaming,
    streamingText,
    streamError,
    optimisticUserMessage,
    regeneratingMessageId,
    sendMessage,
    goOn,
    regenerateMessage,
    stopStreaming,
  };
}
