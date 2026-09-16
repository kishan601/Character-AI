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

  // 1. Build System Message (7-Layer Hierarchy)
  const systemSections: string[] = [];

  // LAYER 1: CHARACTER DEFINITION (Canonical Lore & World Origin)
  const definitionParts: string[] = [];
  if (character.description && character.description.trim()) {
    const processedDesc = interpolateMacros(character.description.trim(), charName, userName);
    definitionParts.push(`[Character Definition (Canonical Identity)]\n${processedDesc}`);
  }
  const processedSystemPrompt = interpolateMacros(
    character.systemPrompt,
    charName,
    userName
  );
  definitionParts.push(`[Character Origin & World Lore]\n${processedSystemPrompt}`);
  systemSections.push(definitionParts.join("\n\n"));

  // LAYER 2: CHARACTER PERSONA (Dynamic Demeanor & Speaking Style)
  const personaParts: string[] = [];
  if (character.persona && character.persona.trim()) {
    const processedPersona = interpolateMacros(character.persona.trim(), charName, userName);
    personaParts.push(`[Active Persona & Speaking Demeanor]\n${processedPersona}`);
  }
  if (character.exampleDialogue && character.exampleDialogue.trim()) {
    const processedExamples = interpolateMacros(
      character.exampleDialogue.trim(),
      charName,
      userName
    );
    personaParts.push(`[Example Dialogue Style]\n${processedExamples}`);
  }
  if (personaParts.length > 0) {
    systemSections.push(personaParts.join("\n\n"));
  }

  // LAYER 3: USER DEFINITION (Persona & Relationship to Character)
  if (userPersona && userPersona.description && userPersona.description.trim()) {
    const processedUserDesc = interpolateMacros(
      userPersona.description.trim(),
      charName,
      userName
    );
    systemSections.push(
      `[User Definition: ${userName}]\n${processedUserDesc}`
    );
  }

  // LAYER 4: AUTHORITATIVE PRONOUN & REFERENCE MAP
  const charPronouns = [
    character.pronounSubject || (character.gender === "female" ? "she" : character.gender === "male" ? "he" : null),
    character.pronounObject || (character.gender === "female" ? "her" : character.gender === "male" ? "him" : null),
    character.pronounPossessive || (character.gender === "female" ? "hers" : character.gender === "male" ? "his" : null),
    character.pronounDeterminer || (character.gender === "female" ? "her" : character.gender === "male" ? "his" : null),
  ].filter(Boolean);

  const userPronouns = [
    userPersona?.pronounSubject || (userPersona?.gender === "female" ? "she" : userPersona?.gender === "male" ? "he" : null),
    userPersona?.pronounObject || (userPersona?.gender === "female" ? "her" : userPersona?.gender === "male" ? "him" : null),
    userPersona?.pronounPossessive || (userPersona?.gender === "female" ? "hers" : userPersona?.gender === "male" ? "his" : null),
    userPersona?.pronounDeterminer || (userPersona?.gender === "female" ? "her" : userPersona?.gender === "male" ? "his" : null),
  ].filter(Boolean);

  const referenceLines: string[] = [
    `• {{char}} = ${charName} (Primary Character)` +
      (character.gender ? ` | Gender: ${character.gender}` : "") +
      (charPronouns.length ? ` | Pronouns: ${charPronouns.join("/")}` : ""),
    `• {{user}} = ${userName} (Conversational Partner)` +
      (userPersona?.gender ? ` | Gender: ${userPersona.gender}` : "") +
      (userPronouns.length ? ` | Pronouns: ${userPronouns.join("/")}` : ""),
  ];
  systemSections.push(`[Grammar & Participant Reference Map]\n${referenceLines.join("\n")}`);

  // LAYER 5: PERSISTENT CONVERSATION STATE (Memories, Summary, Causality)
  if (pinnedMemories && pinnedMemories.length > 0) {
    const memoryLines = pinnedMemories.map((m) => {
      const content = interpolateMacros(m.content, charName, userName);
      return m.label ? `- [${m.label}] ${content}` : `- ${content}`;
    });
    systemSections.push(
      `[Key Pinned Memories & Established Lore]\n${memoryLines.join("\n")}`
    );
  }

  if (rollingSummary && rollingSummary.trim()) {
    const processedSummary = interpolateMacros(
      rollingSummary,
      charName,
      userName
    );
    systemSections.push(
      `[The Story So Far (Persistent State Summary)]\n${processedSummary.trim()}`
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

  // SEMANTIC DIRECTION CONSTRAINT & ROLEPLAY MANDATE
  systemSections.push(
    `[Semantic Direction & Role Preservation]\n` +
      `You are strictly ${charName}. You are in an interactive roleplay with ${userName}.\n` +
      `• PRONOUN RESOLUTION:\n` +
      `  Pronouns and names identify participants according to the configured participant/reference map.\n` +
      `  Pronouns do NOT inherently determine grammatical roles.\n` +
      `• ROLE PRESERVATION:\n` +
      `  Preserve the grammatical and semantic roles expressed by the user's sentence.\n` +
      `  Do not reverse:\n` +
      `  - actor\n` +
      `  - subject\n` +
      `  - object\n` +
      `  - recipient\n` +
      `  - source\n` +
      `  - target\n` +
      `  - direction of an action\n` +
      `  Never reverse these relationships merely because a participant appears as an object/determiner pronoun.\n` +
      `• PERSPECTIVE & PRONOUN ANCHORS:\n` +
      `  - From your viewpoint, you are "${charName}" (first-person "I / me / my / myself").\n` +
      `  - From your viewpoint, the user is "${userName}" (second-person "you / your / yourself" when addressing them).\n` +
      `  - When ${userName} writes to you, any second-person pronouns ("you", "your") refer to YOU (${charName}).\n` +
      `• ANTI-IMPERSONATION MANDATE:\n` +
      `  - You are ${charName} ONLY. NEVER speak, act, narrate thoughts, or make decisions for ${userName}.\n` +
      `  - Do not write "${userName}:" under any circumstance. End your message as soon as ${charName} finishes speaking or acting.\n` +
      `• FORMATTING & STYLE:\n` +
      `  - Write richly and expressively using *italics for actions, body language, thoughts, and atmosphere*, and "quotations for spoken dialogue".\n` +
      `  - Length Target: ${lengthGuidance}`
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

  const sanitizedUserName = sanitizeRoleplayName(userName);
  const sanitizedCharName = sanitizeRoleplayName(charName);

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
    const speakerName = msg.sender === "user" ? sanitizedUserName : sanitizedCharName;
    slidingWindow.unshift({
      role: msg.sender === "user" ? "user" : "assistant",
      name: speakerName,
      content: `${speakerName}: ${content}`,
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

function sanitizeRoleplayName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "User";
}

