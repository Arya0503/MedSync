import fs from "fs";
import path from "path";
import net from "net";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { spawn } from "child_process";

const PORT = 5432;
const HOST = "127.0.0.1";
const PG_DATA_DIR = path.resolve(process.cwd(), "pgdata");

// Check if port 5432 is already occupied
function isPortInUse(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

async function startServer() {
  const inUse = await isPortInUse(PORT, HOST);
  if (inUse) {
    console.log(`[MedBridge DB] Port ${PORT} is already running an active PostgreSQL server. Using existing server.`);
    return null;
  }

  if (!fs.existsSync(PG_DATA_DIR)) {
    fs.mkdirSync(PG_DATA_DIR, { recursive: true });
  }

  console.log(`[MedBridge DB] Initializing embedded PostgreSQL 16 engine in ${PG_DATA_DIR}...`);
  const db = new PGlite(PG_DATA_DIR);
  await db.waitReady;

  const server = new PGLiteSocketServer({
    db,
    port: PORT,
    host: HOST,
  });

  await server.start();
  console.log(`[MedBridge DB] Local PostgreSQL server listening on ${HOST}:${PORT}`);

  // Check if schema is initialized
  try {
    const res = await db.query(`SELECT to_regclass('public."User"') as table_exists;`);
    const exists = res.rows?.[0]?.table_exists;

    if (!exists) {
      console.log("[MedBridge DB] First-time setup: applying initial database migration...");
      const migrationFile = path.resolve(process.cwd(), "prisma/migrations/20261106000000_init/migration.sql");
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, "utf-8");
        await db.exec(sql);
        console.log("[MedBridge DB] Database schema created successfully.");

        // Automatically seed demo data
        console.log("[MedBridge DB] Seeding synthetic clinical demo data (Asha R., demo accounts)...");
        await new Promise((resolve, reject) => {
          const seedProc = spawn("npx", ["tsx", "prisma/seed.ts"], {
            shell: true,
            stdio: "inherit",
            env: { ...process.env, DATABASE_URL: `postgresql://medbridge:medbridge@${HOST}:${PORT}/medbridge` },
          });
          seedProc.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Seed process exited with code ${code}`));
          });
        });
        console.log("[MedBridge DB] Seed completed successfully.");
      }
    } else {
      console.log("[MedBridge DB] Database schema and records ready.");
    }
  } catch (err) {
    console.warn("[MedBridge DB] Migration check note:", err.message);
  }

  const cleanup = async () => {
    console.log("\n[MedBridge DB] Shutting down local PostgreSQL server...");
    try {
      await server.stop();
      console.log("[MedBridge DB] Local PostgreSQL server stopped.");
    } catch (e) {
      // ignore
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  return { db, server };
}

// If executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  startServer().catch((err) => {
    console.error("[MedBridge DB] Error starting local database:", err);
    process.exit(1);
  });
}

export { startServer, isPortInUse };
