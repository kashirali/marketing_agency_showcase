CREATE TABLE `ai_agent_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentName` varchar(255) NOT NULL DEFAULT 'BinaryKode Daily Poster',
	`isActive` boolean NOT NULL DEFAULT true,
	`postingSchedule` json NOT NULL,
	`platforms` json NOT NULL,
	`contentStyle` text,
	`agencyInfo` json NOT NULL,
	`maxPostsPerDay` int NOT NULL DEFAULT 1,
	`includeImages` boolean NOT NULL DEFAULT true,
	`includeHashtags` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agent_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`template` text NOT NULL,
	`platform` enum('linkedin','facebook','twitter','instagram') NOT NULL,
	`category` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('linkedin','facebook','twitter','instagram') NOT NULL,
	`title` varchar(255),
	`content` text NOT NULL,
	`imageUrl` text,
	`hashtags` text,
	`status` enum('draft','scheduled','published','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`engagement` json,
	`externalPostId` varchar(255),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generated_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posting_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentConfigId` int NOT NULL,
	`generatedPostId` int,
	`platform` enum('linkedin','facebook','twitter','instagram') NOT NULL,
	`status` enum('success','failed','pending') NOT NULL,
	`message` text,
	`errorDetails` text,
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `posting_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_media_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('linkedin','facebook','twitter','instagram') NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`accountId` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_media_accounts_id` PRIMARY KEY(`id`)
);
