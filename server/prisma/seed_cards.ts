import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log("Seeding 20 character cards from July to September...");

  const startDate = new Date("2026-07-01T00:00:00.000Z");
  const endDate = new Date("2026-09-16T00:00:00.000Z");

  const adjectives = ["Neon", "Cyber", "Mystic", "Rogue", "Fallen", "Quantum", "Shadow", "Crystal", "Lunar", "Solar", "Crimson", "Azure", "Iron", "Silent", "Lost", "Wandering", "Electric", "Void", "Hollow", "Astral"];
  const nouns = ["Knight", "Hacker", "Mage", "Sniper", "Alchemist", "Drifter", "Samurai", "Oracle", "Pilot", "Bounty Hunter", "Scout", "Assassin", "Guardian", "Witch", "Warlock", "Paladin", "Rebel", "Ghost", "Ronin", "Vanguard"];

  for (let i = 1; i <= 20; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const name = `${adj} ${noun} ${i}`;
    
    const createdAt = randomDate(startDate, endDate);

    await prisma.character.create({
      data: {
        name,
        tagline: `A legendary ${noun.toLowerCase()} from the outer rims.`,
        description: `This is a generated test character card for UI testing.`,
        greeting: `*${name} looks at you carefully.* "State your business."`,
        systemPrompt: `You are ${name}, a ${adj.toLowerCase()} ${noun.toLowerCase()}. Be concise and atmospheric.`,
        avatarUrl: `https://picsum.photos/seed/avatar${i}/300/300`,
        backgroundUrl: `https://picsum.photos/seed/bg${i}/800/600`,
        bgBlur: Math.floor(Math.random() * 5),
        bgDim: Math.floor(Math.random() * 60) + 20,
        createdAt,
        updatedAt: createdAt,
      }
    });
    console.log(`Created [${i}/20]: ${name} (Date: ${createdAt.toISOString().split("T")[0]})`);
  }

  console.log("Successfully seeded 20 characters!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
