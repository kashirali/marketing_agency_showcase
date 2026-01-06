import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { aiAgentRouter } from "./routers/aiAgent";
import { linkedinRouter } from "./routers/linkedinRouter";
import { metaRouter } from "./routers/metaRouter";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: authRouter,

  aiAgent: aiAgentRouter,
  linkedin: linkedinRouter,
  meta: metaRouter,
});

export type AppRouter = typeof appRouter;
