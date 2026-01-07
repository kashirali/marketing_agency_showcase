import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq } from "drizzle-orm";

const { Pool } = pg;

let _db: any = null;

// Lazily create the drizzle instance
export async function getDb() {
  if (!_db) {
    try {
      let dbUrl = ENV.databaseUrl;
      if (!dbUrl) {
        throw new Error("DATABASE_URL is not defined in environment variables");
      }

      // Cleanup dbUrl if it was copied with the variable name prefix
      if (dbUrl.includes("DATABASE_URL=")) {
        dbUrl = dbUrl.split("DATABASE_URL=")[1].trim();
      }

      console.log("[Database] Connecting to PostgreSQL...");

      const isExternal = dbUrl.includes("render.com") || dbUrl.includes("aws") || dbUrl.includes("elephantsql") || dbUrl.includes("ssl=true");

      const pool = new Pool({
        connectionString: dbUrl,
        ssl: isExternal ? { rejectUnauthorized: false } : false,
      });

      // Test the connection immediately
      const client = await pool.connect();
      console.log("[Database] Connection pool established successfully");
      client.release();

      _db = drizzle(pool);
      console.log("[Database] Successfully connected to PostgreSQL");
    } catch (error) {
      console.error("[Database] CRITICAL: Failed to connect:", error);
      _db = null;
      throw error;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: any = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? 'user',
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };

    if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
    }

    // PostgreSQL onConflictDoUpdate
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: {
        name: values.name,
        email: values.email,
        loginMethod: values.loginMethod,
        role: values.role,
        lastSignedIn: values.lastSignedIn,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}
