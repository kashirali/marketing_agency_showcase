import { eq } from "drizzle-orm";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import path from "path";

let _db: any = null;

// Lazily create the drizzle instance
export async function getDb() {
  if (!_db) {
    try {
      const dbUrl = ENV.databaseUrl;
      const isMysql = dbUrl?.startsWith("mysql://");

      if (isMysql) {
        console.log("[Database] Connecting to MySQL...");
        const { drizzle: drizzleMysql } = await import("drizzle-orm/mysql2");
        const mysql = (await import("mysql2/promise")).default;

        // TiDB Cloud and other managed DBs often require SSL
        const connection = await mysql.createConnection({
          uri: dbUrl,
          ssl: {
            rejectUnauthorized: true
          }
        });

        _db = drizzleMysql(connection);
        console.log("[Database] Successfully connected to MySQL");
      } else {
        console.log("[Database] Connecting to SQLite...");
        const { drizzle: drizzleSqlite } = await import("drizzle-orm/better-sqlite3");
        const Database = (await import("better-sqlite3")).default;

        let dbPath = dbUrl;
        if (!dbPath || dbPath.includes("://")) {
          dbPath = path.join(process.cwd(), "data", "marketing_agency.db");
        }
        console.log(`[Database] Connecting to SQLite at: ${dbPath}`);
        const sqlite = new Database(dbPath);
        _db = drizzleSqlite(sqlite);
        console.log("[Database] Successfully connected to SQLite");
      }
    } catch (error) {
      console.error("[Database] CRITICAL: Failed to connect:", error);
      _db = null;
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
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Drizzle handles upsert differently for MySQL and SQLite
    const isMysql = ENV.databaseUrl?.startsWith("mysql://");

    if (isMysql) {
      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    } else {
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
    }
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

// TODO: add feature queries here as your schema grows.
