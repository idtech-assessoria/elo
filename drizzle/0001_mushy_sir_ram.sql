CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`notice_id` text,
	`loan_id` text NOT NULL,
	`audience` text NOT NULL,
	`recipient` text NOT NULL,
	`recipient_name` text NOT NULL,
	`phone` text NOT NULL,
	`status` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`request_payload` text,
	`connection_revision` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`provider_id` text,
	`error` text,
	`first_attempt_at` text,
	`next_attempt_at` text,
	`lease_token` text,
	`lease_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`checked_at` text,
	`whatsapp_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_email_outbox_notice` ON `email_outbox` (`workspace_id`,`notice_id`);--> statement-breakpoint
CREATE INDEX `idx_email_outbox_queue` ON `email_outbox` (`workspace_id`,`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `idx_email_outbox_recipient` ON `email_outbox` (`workspace_id`,`recipient`);--> statement-breakpoint
CREATE TABLE `messaging_connections` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`encrypted_key` text NOT NULL,
	`sender` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`verified_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
