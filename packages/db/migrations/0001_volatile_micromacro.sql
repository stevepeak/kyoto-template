CREATE TABLE `mcp_tool_call` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`tool` text NOT NULL,
	`intent` text NOT NULL,
	`arguments` text,
	`ok` integer NOT NULL,
	`error` text,
	`duration_ms` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mcp_tool_call_user_created_idx` ON `mcp_tool_call` (`user_id`,`created_at`);