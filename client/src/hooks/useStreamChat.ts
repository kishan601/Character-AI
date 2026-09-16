import { useState, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { baseApi } from "../api/baseApi.js";
import { AppDispatch } from "../store/store.js";

interface UseStreamChatOptions {
  sessionId: string;
  onDone?: () => void;
}

export function useStreamChat({ sessionId, onDone }: UseStreamChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingText("");
    setRegeneratingMessageId(null);
    setOptimisticUserMessage(null);
  }, []);

  const sendMessage = useCallback(
    async (userText: string, maxTokens?: number) => {
      if (!userText.trim() || isStreaming) return;

      // 1. Immediately display user message optimistically (Zero Lag!)
      setOptimisticUserMessage(userText.trim());
      setIsStreaming(true);
      setStreamingText("");
      setStreamError(null);
      setRegeneratingMessageId(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            userMessage: userText.trim(),
            maxTokens,
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

              if (data.type === "user_message") {
                if (data.message) {
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
                }
              } else if (data.type === "token") {
                setStreamingText((prev) => prev + data.token);
              } else if (data.type === "done") {
                if (data.message) {
                  dispatch(
                    baseApi.util.updateQueryData("getSession", sessionId, (draft) => {
                      if (!draft.messages) draft.messages = [];
                      const idx = draft.messages.findIndex((m) => m.id === data.message.id);
                      if (idx >= 0) {
                        draft.messages[idx] = data.message;
                      } else {
                        draft.messages.push(data.message);
                      }
                    })
                  );
                }
                setIsStreaming(false);
                setStreamingText("");
                setOptimisticUserMessage(null);
                dispatch(baseApi.util.invalidateTags(["Messages", "Session"]));
                onDone?.();
                return;
              } else if (data.type === "error") {
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
        if (err.name === "AbortError") {
          console.log("Chat stream aborted by user.");
        } else {
          setStreamError(err.message || "Failed to stream chat.");
        }
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        setOptimisticUserMessage(null);
        abortControllerRef.current = null;
        dispatch(baseApi.util.invalidateTags(["Messages", "Session"]));
      }
    },
    [sessionId, isStreaming, dispatch, onDone]
  );

  const regenerateMessage = useCallback(
    async (messageId: string, maxTokens?: number) => {
      if (isStreaming) return;

      // Mark the exact message being regenerated for in-place reload card
      setRegeneratingMessageId(messageId);
      setIsStreaming(true);
      setStreamingText("");
      setStreamError(null);
      setOptimisticUserMessage(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/generate/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            messageId,
            maxTokens,
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
                setStreamingText((prev) => prev + data.token);
              } else if (data.type === "done") {
                if (data.message) {
                  dispatch(
                    baseApi.util.updateQueryData("getSession", sessionId, (draft) => {
                      if (!draft.messages) draft.messages = [];
                      const idx = draft.messages.findIndex((m) => m.id === data.message.id);
                      if (idx >= 0) {
                        draft.messages[idx] = data.message;
                      } else {
                        draft.messages.push(data.message);
                      }
                    })
                  );
                }
                setIsStreaming(false);
                setStreamingText("");
                setRegeneratingMessageId(null);
                dispatch(baseApi.util.invalidateTags(["Messages", "Session"]));
                onDone?.();
                return;
              } else if (data.type === "error") {
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
        if (err.name === "AbortError") {
          console.log("Regeneration stream aborted.");
        } else {
          setStreamError(err.message || "Failed to regenerate.");
        }
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        setRegeneratingMessageId(null);
        abortControllerRef.current = null;
        dispatch(baseApi.util.invalidateTags(["Messages", "Session"]));
      }
    },
    [sessionId, isStreaming, dispatch, onDone]
  );

  const goOn = useCallback(
    async (maxTokens?: number) => {
      if (isStreaming) return;

      setIsStreaming(true);
      setStreamingText("");
      setStreamError(null);
      setRegeneratingMessageId(null);
      setOptimisticUserMessage(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/generate/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            maxTokens,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Continuation failed (${response.status}): ${errText}`);
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
                setStreamingText((prev) => prev + data.token);
              } else if (data.type === "done") {
                if (data.message) {
                  dispatch(
                    baseApi.util.updateQueryData("getSession", sessionId, (draft) => {
                      if (!draft.messages) draft.messages = [];
                      const idx = draft.messages.findIndex((m) => m.id === data.message.id);
                      if (idx >= 0) {
                        draft.messages[idx] = data.message;
                      } else {
                        draft.messages.push(data.message);
                      }
                    })
                  );
                }
                setIsStreaming(false);
                setStreamingText("");
                dispatch(baseApi.util.invalidateTags(["Messages", "Session"]));
                onDone?.();
                return;
              } else if (data.type === "error") {
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
        if (err.name === "AbortError") {
          console.log("Continuation stream aborted by user.");
        } else {
          setStreamError(err.message || "Failed to continue story.");
        }
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        abortControllerRef.current = null;
        dispatch(baseApi.util.invalidateTags(["Messages", "Session"]));
      }
    },
    [sessionId, isStreaming, dispatch, onDone]
  );

  return {
    isStreaming,
    streamingText,
    streamError,
    optimisticUserMessage,
    regeneratingMessageId,
    sendMessage,
    regenerateMessage,
    goOn,
    stopStreaming,
  };
}
