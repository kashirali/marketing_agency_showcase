import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./serveStatic";
import { executeDailyPostingJob, publishDuePosts } from "../services/scheduledPostingService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function createApp() {
  const app = express();

  // Configure body parser with larger size limit
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}

async function startServer() {
  console.log("[Server] Starting with Phase 1 Foundation enhancements...");
  const app = await createApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // ✅ IMPORTANT: Bind to 0.0.0.0 for Render
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);

    // Start background automation
    console.log("[Server] Initializing background automation scheduler...");

    // 1. Check for due posts every hour
    setInterval(() => {
      publishDuePosts().catch(err => console.error("[Scheduler] Error in publishDuePosts:", err));
    }, 1000 * 60 * 60);

    // 2. Run daily generation job every 12 hours
    setInterval(() => {
      executeDailyPostingJob().catch(err => console.error("[Scheduler] Error in executeDailyPostingJob:", err));
    }, 1000 * 60 * 60 * 12);

    // Run initial check for due posts on startup
    publishDuePosts().catch(err => console.error("[Scheduler] Initial publishDuePosts failed:", err));
  });
}

startServer().catch(console.error);
