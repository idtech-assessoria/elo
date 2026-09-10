CREATE TABLE `gmail_setups` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`encrypted_secret` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `email_outbox` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `messaging_connections` ADD `provider` text DEFAULT 'resend' NOT NULL;--> statement-breakpoint
ALTER TABLE `messaging_connections` ADD `endpoint` text;--> statement-breakpoint
ALTER TABLE `messaging_connections` ADD `quota_remaining` integer;