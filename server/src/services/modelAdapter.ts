import { ChatMessage } from "./lmStudioClient.js";

/**
 * P0 Model Adapter
 * Currently provides basic verification and template formatting for models.
 * Future phases will expand this to support model-specific boundaries (e.g. Llama-3 vs ChatML).
 */
export function verifyModelFormat(messages: ChatMessage[], modelId: string): void {
  // P0 verification: Ensure we don't have empty messages that break some models
  for (const msg of messages) {
    if (!msg.content || msg.content.trim() === "") {
      console.warn(`[ModelAdapter] Warning: Empty message content detected for role ${msg.role}. Model: ${modelId}`);
    }
  }

  // Ensure system prompt is first
  if (messages.length > 0 && messages[0].role !== "system") {
    console.warn(`[ModelAdapter] Warning: System prompt is not the first message. Model: ${modelId}`);
  }
}

/**
 * Formats stop tokens based on the model and characters.
 */
export function getStopTokens(userName: string, modelId: string): string[] {
  const sanitizedUserName = userName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "User";
  
  return [
    `\n${userName}:`,
    `\n\n${userName}:`,
    `\n${sanitizedUserName}:`,
    `\n\n${sanitizedUserName}:`,
    `\nUser:`,
    `\n\nUser:`,
    `\n{{user}}:`,
    `\n\n{{user}}:`,
    `<|im_end|>`, // ChatML fallback
    `<|eot_id|>` // Llama 3 fallback
  ];
}
