import { config } from "../config.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LMStudioHealth {
  connected: boolean;
  model: string | null;
  models: string[];
  error?: string;
}

export class LMStudioClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.lmStudioUrl) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<LMStudioHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.baseUrl}/models`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          connected: false,
          model: null,
          models: [],
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = (data.data || []).map((m) => m.id);
      return {
        connected: true,
        model: models[0] || "Default Loaded Model",
        models,
      };
    } catch (err: any) {
      return {
        connected: false,
        model: null,
        models: [],
        error: err.message || "Failed to connect to LM Studio",
      };
    }
  }

  async complete(params: {
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model || "local-model",
        messages: params.messages,
        max_tokens: params.maxTokens || 400,
        max_completion_tokens: params.maxTokens || 400,
        temperature: params.temperature ?? 0.8,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LM Studio error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || "";
  }

  async streamChat(params: {
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
    model?: string;
    stop?: string[];
    signal?: AbortSignal;
    onToken: (token: string) => void;
  }): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model || "local-model",
        messages: params.messages,
        max_tokens: params.maxTokens || 400,
        max_completion_tokens: params.maxTokens || 400,
        temperature: params.temperature ?? 0.8,
        stop: params.stop && params.stop.length > 0 ? params.stop : undefined,
        stream: true,
      }),
      signal: params.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LM Studio stream error (${res.status}): ${errText}`);
    }

    if (!res.body) {
      throw new Error("No response body received from LM Studio stream");
    }

    let fullText = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") {
            return fullText;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              params.onToken(delta);
            }
          } catch {
            // Ignore parse errors on malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }
}

export const lmStudioClient = new LMStudioClient();
