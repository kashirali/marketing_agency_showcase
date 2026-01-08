
import { getDb } from "./server/db";
import { socialMediaAccounts } from "./drizzle/schema";

async function checkAccounts() {
    const db = await getDb();
    if (!db) {
        console.error("Database not available");
        return;
    }

    const accounts = await db.select().from(socialMediaAccounts);
    console.log("ALL ACCOUNTS:");
    console.log(JSON.stringify(accounts, null, 2));
}

checkAccounts().catch(console.error);
