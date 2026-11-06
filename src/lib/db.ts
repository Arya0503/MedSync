import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let databaseUrl = process.env.DATABASE_URL || "postgresql://medbridge:medbridge@127.0.0.1:5432/medbridge";
if (!databaseUrl.includes("connection_limit")) {
  databaseUrl += databaseUrl.includes("?") ? "&connection_limit=1" : "?connection_limit=1";
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
