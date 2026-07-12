CREATE TABLE `material_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`material_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text,
	`platform` text DEFAULT '待识别' NOT NULL,
	`tag` text DEFAULT '待分类' NOT NULL,
	`status` text DEFAULT '待分析' NOT NULL,
	`note` text,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`analysis_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monitor_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization` text NOT NULL,
	`region` text NOT NULL,
	`keywords` text NOT NULL,
	`sources` text NOT NULL,
	`frequency` text NOT NULL,
	`review_mode` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
