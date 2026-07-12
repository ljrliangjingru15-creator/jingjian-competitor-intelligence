CREATE TABLE `discoveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`source` text NOT NULL,
	`summary` text,
	`confidence` text DEFAULT 'B',
	`status` text DEFAULT '待审核' NOT NULL,
	`published_at` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period` text NOT NULL,
	`format` text NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT '已生成' NOT NULL,
	`created_at` integer NOT NULL
);
