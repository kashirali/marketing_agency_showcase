
import { getDb } from "./server/db";

async function checkIndexes() {
    const db = await getDb();
    if (!db) {
        console.error("Database not available");
        return;
    }

    // Raw query to check indexes in Postgres
    const result = await db.execute("SELECT * FROM pg_indexes WHERE tablename = 'social_media_accounts'");
    console.log("INDEXES:");
    console.log(JSON.stringify(result, null, 2));

    // Check unique constraints
    const constr = await db.execute("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public' AND conrelid = 'social_media_accounts'::regclass");
    console.log("CONSTRAINTS:");
    console.log(JSON.stringify(constr, null, 2));
}

checkIndexes().catch(console.error);
