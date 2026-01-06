import "dotenv/config";
import { getDb } from "./server/db";

async function testConnection() {
    try {
        const db = await getDb();
        if (db) {
            console.log("SUCCESS: Database connection established");
            process.exit(0);
        } else {
            console.error("FAILURE: Database connection returned null");
            process.exit(1);
        }
    } catch (error) {
        console.error("ERROR: Exception during database connection:", error);
        process.exit(1);
    }
}

testConnection();
