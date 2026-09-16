import { prisma } from "../src/db.js";
import { sanitizeAssistantResponse } from "../src/services/contextEngine.js";
import { parseSwipes, serializeSwipes } from "../src/routes/messages.js";

async function main() {
  const messages = await prisma.message.findMany({
    where: { sender: "assistant" },
    include: { session: { include: { character: true, userPersona: true } } },
  });

  for (const msg of messages) {
    const userName = msg.session.userPersona?.name || "Traveler";
    const charName = msg.session.character.name;
    const swipes = parseSwipes(msg.swipes);
    const cleanedSwipes = swipes.map((s) => sanitizeAssistantResponse(s, userName, charName));

    await prisma.message.update({
      where: { id: msg.id },
      data: { swipes: serializeSwipes(cleanedSwipes) },
    });
  }

  console.log(`Successfully checked and cleaned ${messages.length} assistant messages in database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
