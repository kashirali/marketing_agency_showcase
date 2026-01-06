import { integer as sqliteInteger, sqliteTable, text as sqliteText } from "drizzle-orm/sqlite-core";
import { int as mysqlInteger, mysqlTable, text as mysqlText, timestamp as mysqlTimestamp, varchar as mysqlVarchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

const isMysql = process.env.DATABASE_URL?.startsWith("mysql://");

// Helper to define matching columns for both DBs
function defineTable<T extends string>(name: T, sqliteCols: any, mysqlCols: any) {
  return isMysql ? mysqlTable(name, mysqlCols) : sqliteTable(name, sqliteCols);
}

/**
 * Core user table
 */
export const users = defineTable("users", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  openId: sqliteText("openId").unique(),
  name: sqliteText("name"),
  email: sqliteText("email").notNull().unique(),
  password: sqliteText("password"),
  loginMethod: sqliteText("loginMethod"),
  role: sqliteText("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  lastSignedIn: sqliteInteger("lastSignedIn", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, {
  id: mysqlInteger("id").primaryKey().autoincrement(),
  openId: mysqlVarchar("openId", { length: 255 }).unique(),
  name: mysqlVarchar("name", { length: 255 }),
  email: mysqlVarchar("email", { length: 255 }).notNull().unique(),
  password: mysqlText("password"),
  loginMethod: mysqlVarchar("loginMethod", { length: 50 }),
  role: mysqlVarchar("role", { length: 20 }).default("user").notNull(),
  createdAt: mysqlTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: mysqlTimestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: mysqlTimestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Social media accounts
 */
export const socialMediaAccounts = defineTable("social_media_accounts", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("userId").notNull(),
  platform: sqliteText("platform", { enum: ["linkedin", "facebook", "twitter", "instagram"] }).notNull(),
  accountName: sqliteText("accountName").notNull(),
  accessToken: sqliteText("accessToken").notNull(),
  refreshToken: sqliteText("refreshToken"),
  accountId: sqliteText("accountId").notNull(),
  isActive: sqliteInteger("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, {
  id: mysqlInteger("id").primaryKey().autoincrement(),
  userId: mysqlInteger("userId").notNull(),
  platform: mysqlVarchar("platform", { length: 20 }).notNull(),
  accountName: mysqlVarchar("accountName", { length: 255 }).notNull(),
  accessToken: mysqlText("accessToken").notNull(),
  refreshToken: mysqlText("refreshToken"),
  accountId: mysqlVarchar("accountId", { length: 255 }).notNull(),
  isActive: mysqlInteger("isActive").default(1).notNull(), // Booleans are 0/1 in MySQL
  createdAt: mysqlTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: mysqlTimestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * AI-generated social media posts
 */
export const generatedPosts = defineTable("generated_posts", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("userId").notNull(),
  platform: sqliteText("platform", { enum: ["linkedin", "facebook", "twitter", "instagram"] }).notNull(),
  title: sqliteText("title").notNull(),
  content: sqliteText("content").notNull(),
  agentId: sqliteInteger("agentId"),
  hashtags: sqliteText("hashtags"),
  status: sqliteText("status", { enum: ["draft", "scheduled", "published", "failed"] }).default("draft").notNull(),
  mediaUrl: sqliteText("mediaUrl"),
  mediaType: sqliteText("mediaType", { enum: ["image", "video", "carousel"] }),
  mediaPrompt: sqliteText("mediaPrompt"),
  externalPostId: sqliteText("externalPostId"),
  scheduledAt: sqliteInteger("scheduledAt", { mode: "timestamp" }),
  publishedAt: sqliteInteger("publishedAt", { mode: "timestamp" }),
  createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, {
  id: mysqlInteger("id").primaryKey().autoincrement(),
  userId: mysqlInteger("userId").notNull(),
  platform: mysqlVarchar("platform", { length: 20 }).notNull(),
  title: mysqlVarchar("title", { length: 255 }).notNull(),
  content: mysqlText("content").notNull(),
  agentId: mysqlInteger("agentId"),
  hashtags: mysqlText("hashtags"),
  status: mysqlVarchar("status", { length: 20 }).default("draft").notNull(),
  mediaUrl: mysqlText("mediaUrl"),
  mediaType: mysqlVarchar("mediaType", { length: 20 }),
  mediaPrompt: mysqlText("mediaPrompt"),
  externalPostId: mysqlVarchar("externalPostId", { length: 255 }),
  scheduledAt: mysqlTimestamp("scheduledAt"),
  publishedAt: mysqlTimestamp("publishedAt"),
  createdAt: mysqlTimestamp("createdAt").defaultNow().notNull(),
});

/**
 * AI Agent Configuration
 */
export const aiAgentConfig = defineTable("ai_agent_config", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("userId").notNull(),
  agentName: sqliteText("agentName").notNull(),
  isActive: sqliteInteger("isActive", { mode: "boolean" }).default(true).notNull(),
  postingSchedule: sqliteText("postingSchedule"),
  platforms: sqliteText("platforms"),
  contentStyle: sqliteText("contentStyle"),
  maxPostsPerDay: sqliteInteger("maxPostsPerDay").default(3).notNull(),
  includeImages: sqliteInteger("includeImages", { mode: "boolean" }).default(true).notNull(),
  includeHashtags: sqliteInteger("includeHashtags", { mode: "boolean" }).default(true).notNull(),
  agencyInfo: sqliteText("agencyInfo"),
  selectedAccounts: sqliteText("selectedAccounts"),
  nextRunAt: sqliteInteger("nextRunAt", { mode: "timestamp" }),
  createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, {
  id: mysqlInteger("id").primaryKey().autoincrement(),
  userId: mysqlInteger("userId").notNull(),
  agentName: mysqlVarchar("agentName", { length: 255 }).notNull(),
  isActive: mysqlInteger("isActive").default(1).notNull(),
  postingSchedule: mysqlText("postingSchedule"),
  platforms: mysqlText("platforms"),
  contentStyle: mysqlText("contentStyle"),
  maxPostsPerDay: mysqlInteger("maxPostsPerDay").default(3).notNull(),
  includeImages: mysqlInteger("includeImages").default(1).notNull(),
  includeHashtags: mysqlInteger("includeHashtags").default(1).notNull(),
  agencyInfo: mysqlText("agencyInfo"),
  selectedAccounts: mysqlText("selectedAccounts"),
  nextRunAt: mysqlTimestamp("nextRunAt"),
  createdAt: mysqlTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: mysqlTimestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Posting logs
 */
export const postingLogs = defineTable("posting_logs", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("userId").notNull(),
  postId: sqliteInteger("postId").notNull(),
  agentId: sqliteInteger("agentId"),
  platform: sqliteText("platform", { enum: ["linkedin", "facebook", "twitter", "instagram"] }).notNull(),
  status: sqliteText("status", { enum: ["success", "failed", "pending"] }).notNull(),
  platformPostId: sqliteText("platformPostId"),
  errorMessage: sqliteText("errorMessage"),
  attemptedAt: sqliteInteger("attemptedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, {
  id: mysqlInteger("id").primaryKey().autoincrement(),
  userId: mysqlInteger("userId").notNull(),
  postId: mysqlInteger("postId").notNull(),
  agentId: mysqlInteger("agentId"),
  platform: mysqlVarchar("platform", { length: 20 }).notNull(),
  status: mysqlVarchar("status", { length: 20 }).notNull(),
  platformPostId: mysqlVarchar("platformPostId", { length: 255 }),
  errorMessage: mysqlText("errorMessage"),
  attemptedAt: mysqlTimestamp("attemptedAt").defaultNow().notNull(),
});

/**
 * Content templates
 */
export const contentTemplates = defineTable("content_templates", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  userId: sqliteInteger("userId").notNull(),
  name: sqliteText("name").notNull(),
  platform: sqliteText("platform", { enum: ["linkedin", "facebook", "twitter", "instagram"] }).notNull(),
  template: sqliteText("template").notNull(),
  variables: sqliteText("variables"),
  createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, {
  id: mysqlInteger("id").primaryKey().autoincrement(),
  userId: mysqlInteger("userId").notNull(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  platform: mysqlVarchar("platform", { length: 20 }).notNull(),
  template: mysqlText("template").notNull(),
  variables: mysqlText("variables"),
  createdAt: mysqlTimestamp("createdAt").defaultNow().notNull(),
  updatedAt: mysqlTimestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});