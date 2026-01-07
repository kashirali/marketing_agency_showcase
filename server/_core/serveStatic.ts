import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: Express) {
    // In production (bundled to dist/index.js), public is in dist/public
    // In development (running from server/_core/index.ts), it's in ../../dist/public

    const possiblePaths = [
        path.resolve(__dirname, "public"), // Relative to bundled dist/index.js
        path.resolve(__dirname, "../../dist/public"), // Relative to server/_core/index.ts (dev build)
        path.resolve(process.cwd(), "dist/public"), // Absolute from project root
    ];

    let distPath = "";
    for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
            distPath = p;
            break;
        }
    }

    if (!distPath) {
        console.error(
            `[Server] CRITICAL: Could not find build directory in any of: ${possiblePaths.join(", ")}`
        );
        // Fallback to first possible path to avoid app crash, but log error
        distPath = possiblePaths[0];
    } else {
        console.log(`[Server] Serving static files from: ${distPath}`);
    }

    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
        const indexPath = path.resolve(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send("Not Found");
        }
    });
}
