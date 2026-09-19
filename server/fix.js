const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "Message" ALTER COLUMN "swipes" DROP DEFAULT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "Message" ALTER COLUMN "swipes" TYPE text[] USING swipes::text[];');
  await prisma.$executeRawUnsafe('ALTER TABLE "Message" ALTER COLUMN "swipes" SET DEFAULT \'{}\';');
  console.log("Successfully cast swipes to text array");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
