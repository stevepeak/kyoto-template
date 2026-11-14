CREATE TABLE `chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`workflow_run_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `chat_room`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_message_room_created_idx` ON `chat_message` (`room_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `chat_room` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
