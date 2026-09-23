import { PrismaClient } from "@prisma/client";
import { assembleContext } from "./src/services/contextEngine.js";
import { lmStudioClient } from "./src/services/lmStudioClient.js";

const prisma = new PrismaClient();

async function run() {
  try {
    const character = await prisma.character.findFirst();
    if (!character) {
      console.log("No characters found in DB");
      return;
    }

    console.log(`Testing with Character: ${character.name}`);

    // Create a dummy user persona
    const userPersona = { name: "TestUser" } as any;

    // Simulate 2 messages
    const messages = [
      { sender: "user", text: "Hello there!", activeSwipeIndex: 0, orderIndex: 0, swipes: JSON.stringify(["Hello there!"]) },
      { sender: "assistant", text: "Hi, I am ready.", activeSwipeIndex: 0, orderIndex: 1, swipes: JSON.stringify(["Hi, I am ready."]) },
      { sender: "user", text: "What's up?", activeSwipeIndex: 0, orderIndex: 2, swipes: JSON.stringify(["What's up?"]) },
    ] as any[];

    const { messages: compiledMessages, systemTokens } = assembleContext({
      character,
      userPersona,
      pinnedMemories: [],
      messages,
      preferredMaxTokens: 400,
      modelContextLimit: 4096,
    });

    console.log(`System tokens: ${systemTokens}`);
    console.log(`Total messages in prompt: ${compiledMessages.length}`);
    console.log("-----------------------------------------");
    console.log(JSON.stringify(compiledMessages, null, 2));
    console.log("-----------------------------------------");

    console.log("Sending to LM Studio (nvidia/nemotron-3-nano-4b)...");
    
    // Simulate regeneration (streaming)
    const stopTokens = [
      `\nTestUser:`, `\n\nTestUser:`, `\nUser:`, `\n\nUser:`, `\n{{user}}:`, `\n\n{{user}}:`
    ];

    await lmStudioClient.streamChat({
      messages: compiledMessages,
      model: "nvidia/nemotron-3-nano-4b",
      maxTokens: 400,
      temperature: 1.15,
      presencePenalty: 0.65,
      frequencyPenalty: 0.55,
      stop: stopTokens,
      onToken: (token) => {
        process.stdout.write(token);
      },
      aiConfig: {
        aiProvider: "Custom",
        aiEndpoint: "http://192.168.29.240:1234/v1/chat/completions",
        aiApiKey: "",
        aiModel: "nvidia/nemotron-3-nano-4b"
      }
    });
    
    console.log("\n[DONE]");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
