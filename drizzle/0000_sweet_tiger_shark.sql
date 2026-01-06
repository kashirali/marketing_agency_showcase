CREATE TABLE `ai_agent_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`agentName` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`postingSchedule` text,
	`platforms` text,
	`contentStyle` text,
	`maxPostsPerDay` integer DEFAULT 3 NOT NULL,
	`includeImages` integer DEFAULT true NOT NULL,
	`includeHashtags` integer DEFAULT true NOT NULL,
	`agencyInfo` text,
	`nextRunAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_agent_config_userId_unique` ON `ai_agent_config` (`userId`);--> statement-breakpoint
CREATE TABLE `content_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`template` text NOT NULL,
	`variables` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generated_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`platform` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`hashtags` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduledAt` integer,
	`publishedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posting_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`postId` integer NOT NULL,
	`platform` text NOT NULL,
	`status` text NOT NULL,
	`platformPostId` text,
	`errorMessage` text,
	`attemptedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_media_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`platform` text NOT NULL,
	`accountName` text NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`accountId` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);