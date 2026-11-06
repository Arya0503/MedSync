import { spawn } from "child_process";
import net from "net";

const PORT = 5432;
const HOST = "127.0.0.1";

function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
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

async function waitForPort(port, host, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    const ok = await checkPort(port, host);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const isRunning = await checkPort(PORT, HOST);
  let dbProcess = null;

  if (!isRunning) {
    console.log(`[MedBridge] PostgreSQL is not running on ${HOST}:${PORT}.`);
    console.log(`[MedBridge] Auto-starting embedded local PostgreSQL 16 database...`);
    dbProcess = spawn("node", ["scripts/db-server.mjs"], {
      stdio: "inherit",
      shell: true,
    });

    const ready = await waitForPort(PORT, HOST);
    if (!ready) {
      console.error(`[MedBridge] Timed out waiting for database on ${HOST}:${PORT}`);
      process.exit(1);
    }
    // Give it a brief moment to finish any first-time migration/seed
    await new Promise((r) => setTimeout(r, 1000));
  } else {
    console.log(`[MedBridge] Connected to PostgreSQL on ${HOST}:${PORT}.`);
  }

  console.log(`[MedBridge] Starting Next.js development server...`);
  const nextProcess = spawn("npx", ["next", "dev"], {
    stdio: "inherit",
    shell: true,
  });

  const cleanup = () => {
    if (nextProcess) nextProcess.kill();
    if (dbProcess) dbProcess.kill();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  nextProcess.on("exit", (code) => {
    if (dbProcess) dbProcess.kill();
    process.exit(code || 0);
  });
}

main().catch(console.error);
