
import { getDb } from "./server/db";
import { socialMediaAccounts } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

async function cleanupDuplicates() {
    const db = await getDb();
    if (!db) {
        console.error("Database not available");
        return;
    }

    // Find all facebook accounts
    const accounts = await db.select().from(socialMediaAccounts).where(eq(socialMediaAccounts.platform, "facebook"));

    const seen = new Set();
    const toDelete = [];

    for (const acc of accounts) {
        const key = `${acc.userId}-${acc.platform}-${acc.accountId}`;
        if (seen.has(key)) {
            toDelete.push(acc.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting duplicates: ${toDelete.join(", ")}`);
        for (const id of toDelete) {
            await db.delete(socialMediaAccounts).where(eq(socialMediaAccounts.id, id));
        }
        console.log("Cleanup complete");
    } else {
        console.log("No duplicates found");
    }
}

cleanupDuplicates().catch(console.error);
