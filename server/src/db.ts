import { PrismaClient } from "@prisma/client";

// Global singleton pattern to prevent multiple instances during hot-reloading
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const basePrisma = globalForPrisma.prisma || new PrismaClient();

export const prisma = (basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const result = await query(args);
        const duration = Math.round(performance.now() - start);
        if (duration > 150) {
          console.log(`📡 [DB Query] ${model}.${operation} took ${duration}ms`);
        }
        return result;
      },
    },
  },
}) as unknown) as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
