import { integer, pgTable, text, timestamp, serial, boolean, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const platformEnum = pgEnum("platform", ["linkedin", "facebook", "twitter", "instagram"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "scheduled", "published", "failed"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video", "carousel"]);
export const logStatusEnum = pgEnum("log_status", ["success", "failed", "pending"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: text("openId").unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password"),
  loginMethod: text("loginMethod"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Social media accounts configuration table
 */
export const socialMediaAccounts = pgTable("social_media_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  platform: platformEnum("platform").notNull(),
  accountName: text("accountName").notNull(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  accountId: text("accountId").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;
export type InsertSocialMediaAccount = typeof socialMediaAccounts.$inferInsert;

/**
 * AI-generated social media posts
 */
export const generatedPosts = pgTable("generated_posts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  platform: platformEnum("platform").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  agentId: integer("agentId"),
  hashtags: text("hashtags"),
  status: postStatusEnum("status").default("draft").notNull(),
  mediaUrl: text("mediaUrl"),
  mediaType: mediaTypeEnum("mediaType"),
  mediaPrompt: text("mediaPrompt"),
  externalPostId: text("externalPostId"),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedPost = typeof generatedPosts.$inferSelect;
export type InsertGeneratedPost = typeof generatedPosts.$inferInsert;

/**
 * AI Agent Configuration
 */
export const aiAgentConfig = pgTable("ai_agent_config", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  agentName: text("agentName").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  postingSchedule: text("postingSchedule"),
  platforms: text("platforms"),
  contentStyle: text("contentStyle"),
  maxPostsPerDay: integer("maxPostsPerDay").default(3).notNull(),
  includeImages: boolean("includeImages").default(true).notNull(),
  includeHashtags: boolean("includeHashtags").default(true).notNull(),
  agencyInfo: text("agencyInfo"),
  selectedAccounts: text("selectedAccounts"),
  nextRunAt: timestamp("nextRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AIAgentConfig = typeof aiAgentConfig.$inferSelect;
export type InsertAIAgentConfig = typeof aiAgentConfig.$inferInsert;

/**
 * Posting logs
 */
export const postingLogs = pgTable("posting_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  postId: integer("postId").notNull(),
  agentId: integer("agentId"),
  platform: platformEnum("platform").notNull(),
  status: logStatusEnum("status").notNull(),
  platformPostId: text("platformPostId"),
  errorMessage: text("errorMessage"),
  attemptedAt: timestamp("attemptedAt").defaultNow().notNull(),
});

export type PostingLog = typeof postingLogs.$inferSelect;
export type InsertPostingLog = typeof postingLogs.$inferInsert;

/**
 * Content templates
 */
export const contentTemplates = pgTable("content_templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  platform: platformEnum("platform").notNull(),
  template: text("template").notNull(),
  variables: text("variables"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ContentTemplate = typeof contentTemplates.$inferSelect;
export type InsertContentTemplate = typeof contentTemplates.$inferInsert;