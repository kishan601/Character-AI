import { prisma } from "../src/db.js";

/**
 * Script: clean-sessions.ts
 * Purpose: Inspect, diagnose, and clean up empty or stale chat sessions.
 * Usage:
 *   npx tsx scripts/clean-sessions.ts               # List summary of sessions
 *   npx tsx scripts/clean-sessions.ts --delete-empty # Clean empty sessions (0 messages)
 */

async function main() {
  const args = process.argv.slice(2);
  const shouldDeleteEmpty = args.includes("--delete-empty");

  console.log("🔍 Scanning ChatSessions in database...\n");

  // Query sessions with message counts
  const sessions = await prisma.chatSession.findMany({
    include: {
      character: { select: { name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Found ${sessions.length} total chat sessions:`);
  console.log("--------------------------------------------------");

  let emptyCount = 0;
  for (const s of sessions) {
    const msgCount = s._count.messages;
    const isEmp = msgCount === 0;
    if (isEmp) emptyCount++;

    console.log(
      `• [${s.id}] Character: "${s.character?.name || "Unknown"}" | Messages: ${msgCount} | Updated: ${s.updatedAt.toISOString()}${
        isEmp ? " (EMPTY)" : ""
      }`
    );
  }

  console.log("--------------------------------------------------");
  console.log(`Total sessions: ${sessions.length} | Empty sessions: ${emptyCount}\n`);

  if (emptyCount > 0) {
    if (shouldDeleteEmpty) {
      console.log(`🗑️ Deleting ${emptyCount} empty session(s)...`);
      const deleted = await prisma.chatSession.deleteMany({
        where: {
          messages: {
            none: {},
          },
        },
      });
      console.log(`✓ Successfully cleaned up ${deleted.count} empty sessions.`);
    } else {
      console.log(
        "💡 To delete all empty sessions, re-run with: npx tsx scripts/clean-sessions.ts --delete-empty"
      );
    }
  } else {
    console.log("✓ No empty sessions found. Database is clean!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
