import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function r() {
  try {
    const s = await prisma.chatSession.findUnique({
      where: { id: "cmubgffbx000eupn0img4yq25" },
      include: { messages: true }
    });
    const lastMessage = s.messages[s.messages.length - 1];
    console.log(lastMessage.id);
  } finally {
    await prisma.$disconnect();
  }
}
r();
