import { Character, UserPersona, PinnedMemory, Message } from "@prisma/client";
import { ChatMessage } from "./lmStudioClient.js";
import { countTokens, calculateSlidingBudget } from "./tokenCounter.js";
import { config } from "../config.js";

export function interpolateMacros(text: string, charName: string, userName: string): string {
  if (!text) return "";
  return text
    .replace(/\{\{char\}\}/gi, charName)
    .replace(/\{\{user\}\}/gi, userName);
}

export function extractActiveSwipe(message: Message): string {
  let swipesArray: string[] = [];
  if (Array.isArray(message.swipes)) {
    swipesArray = message.swipes;
  } else if (typeof message.swipes === "string") {
    try {
      swipesArray = JSON.parse(message.swipes);
    } catch {
      swipesArray = [message.swipes];
    }
  }

  const idx = message.activeSwipeIndex ?? 0;
  return swipesArray[idx] || swipesArray[0] || "";
}

export interface AssembleContextParams {
  character: Character;
  userPersona?: UserPersona | null;
  pinnedMemories: PinnedMemory[];
  rollingSummary?: string | null;
  messages: Message[];
  preferredMaxTokens?: number;
  modelContextLimit?: number;
}

export function assembleContext(params: AssembleContextParams): {
  messages: ChatMessage[];
  slidingCount: number;
  systemTokens: number;
} {
  const {
    character,
    userPersona,
    pinnedMemories,
    rollingSummary,
    messages,
    preferredMaxTokens = config.defaultMaxTokens,
    modelContextLimit = config.defaultContextLimit,
  } = params;

  const charName = character.name;
  const userName = userPersona?.name || "User";

  // 1. Build System Message
  const systemSections: string[] = [];

  // 1.1 Character Core Persona & Lore
  const processedSystemPrompt = interpolateMacros(
    character.systemPrompt,
    charName,
    userName
  );
  systemSections.push(`[Character Identity: ${charName}]\n${processedSystemPrompt}`);

  if (character.exampleDialogue) {
    const processedExamples = interpolateMacros(
      character.exampleDialogue,
      charName,
      userName
    );
    systemSections.push(`[Example Dialogue Style]\n${processedExamples}`);
  }

  // 1.2 User Persona
  if (userPersona && userPersona.description) {
    const processedUserDesc = interpolateMacros(
      userPersona.description,
      charName,
      userName
    );
    systemSections.push(
      `[User Identity: ${userName}]\nThe user interacting with you is named ${userName}. Details:\n${processedUserDesc}`
    );
  }

  // 1.3 Pinned Core Memories
  if (pinnedMemories && pinnedMemories.length > 0) {
    const memoryLines = pinnedMemories.map((m) => {
      const content = interpolateMacros(m.content, charName, userName);
      return m.label ? `- [${m.label}] ${content}` : `- ${content}`;
    });
    systemSections.push(
      `[Key Pinned Memories & Lore (Never Forget)]\n${memoryLines.join("\n")}`
    );
  }

  // 1.4 Rolling Summary ("The Story So Far")
  if (rollingSummary && rollingSummary.trim()) {
    const processedSummary = interpolateMacros(
      rollingSummary,
      charName,
      userName
    );
    systemSections.push(
      `[The Story So Far (Previous Events Summary)]\n${processedSummary.trim()}`
    );
  }

  let lengthGuidance = "Keep your reply around 1 to 2 moderate paragraphs.";
  if (preferredMaxTokens <= 180) {
    lengthGuidance = "CRITICAL: Keep your reply very brief and concise: 1 to 2 sentences max. Do not ramble.";
  } else if (preferredMaxTokens <= 500) {
    lengthGuidance = "Keep your reply around 1 to 2 balanced paragraphs.";
  } else if (preferredMaxTokens <= 1000) {
    lengthGuidance = "Provide a long, expansive roleplay response with rich descriptive details and dialogue.";
  } else {
    lengthGuidance = "Provide an extensive, novel-length response with immersive atmosphere, inner thoughts, and detailed dialogue.";
  }

  // 1.5 Roleplay and formatting instruction + Strict Anti-Impersonation Rule + Dynamic Length
  systemSections.push(
    `[Roleplay Guidelines]\n` +
      `Stay strictly in-character as ${charName}. Write richly and expressively using *italics for actions, body language, thoughts, and atmosphere*, and "quotations for spoken dialogue". React directly to ${userName}.\n` +
      `Length Target: ${lengthGuidance}\n` +
      `CRITICAL MANDATE: You are ${charName} ONLY. NEVER speak, act, narrate, or make decisions for ${userName}. Do not write "${userName}:" under any circumstance. End your message as soon as ${charName} finishes speaking or acting.`
  );

  const fullSystemContent = systemSections.join("\n\n");
  const systemTokens = countTokens(fullSystemContent);

  // 2. Token Budget calculation for Sliding Window
  const slidingBudget = calculateSlidingBudget({
    modelContextLimit,
    reserveTokens: preferredMaxTokens,
    systemOverhead: systemTokens,
  });

  // 3. Assemble Sliding Window Messages (Newest -> Oldest until budget exhausted)
  const activeMessages = messages.filter((m) => !m.isDeleted);
  const slidingWindow: ChatMessage[] = [];
  let accumulatedTokens = 0;

  for (let i = activeMessages.length - 1; i >= 0; i--) {
    const msg = activeMessages[i];
    const rawContent = extractActiveSwipe(msg);
    const content = interpolateMacros(rawContent, charName, userName);
    const msgTokens = countTokens(content) + 4; // overhead per turn

    if (accumulatedTokens + msgTokens > slidingBudget && slidingWindow.length >= 2) {
      // Budget reached; keep at least recent turns
      break;
    }

    accumulatedTokens += msgTokens;
    slidingWindow.unshift({
      role: msg.sender === "user" ? "user" : "assistant",
      content,
    });
  }

  const finalMessages: ChatMessage[] = [
    { role: "system", content: fullSystemContent },
    ...slidingWindow,
  ];

  return {
    messages: finalMessages,
    slidingCount: slidingWindow.length,
    systemTokens,
  };
}

export function sanitizeAssistantResponse(
  rawText: string,
  userName: string,
  charName: string
): string {
  if (!rawText) return "";
  let cleaned = rawText.trim();

  // 1. If model outputs leading user script line (e.g. "Traveler: ... \n\nSeraphina: ...")
  // Strip out the fabricated user speech at the beginning
  const leadingUserPattern = new RegExp(
    `^\\s*(${escapeRegex(userName)}|User|{{user}}):[\\s\\S]*?\\n+(${escapeRegex(charName)}|Assistant|{{char}}):\\s*`,
    "i"
  );
  cleaned = cleaned.replace(leadingUserPattern, "");

  // 2. If model generates a subsequent user line (e.g. "\n\nTraveler: ..."), cut off generation there
  const trailingUserPattern = new RegExp(
    `\\n+\\s*(${escapeRegex(userName)}|User|{{user}}):[\\s\\S]*$`,
    "i"
  );
  cleaned = cleaned.replace(trailingUserPattern, "");

  // 3. Strip any stray character name prefix at the very beginning (e.g. "Seraphina Vance: ")
  const charPrefixPattern = new RegExp(
    `^\\s*(${escapeRegex(charName)}|Assistant):\\s*`,
    "i"
  );
  cleaned = cleaned.replace(charPrefixPattern, "");

  return cleaned.trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

