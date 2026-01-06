import { createApp } from "../server/_core/index";

export default async function handler(req: any, res: any) {
    try {
        console.log(`[API] Handling ${req.method} ${req.url}`);
        const app = await createApp();
        return app(req, res);
    } catch (error) {
        console.error("[API] CRITICAL ERROR in handler:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
