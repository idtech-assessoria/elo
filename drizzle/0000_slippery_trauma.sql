CREATE TABLE `commands` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`kind` text NOT NULL,
	`revision` integer NOT NULL,
	`result` text NOT NULL,
	`at` text NOT NULL,
	`guard` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "command_revision_guard" CHECK("commands"."guard" = 1)
);
--> statement-breakpoint
CREATE INDEX `idx_commands_workspace_at` ON `commands` (`workspace_id`,`at`);--> statement-breakpoint
CREATE TABLE `loan_events` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`at` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_loan_events_loan_at` ON `loan_events` (`loan_id`,`at`);--> statement-breakpoint
CREATE TABLE `loan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`returned` integer NOT NULL,
	`sold` integer NOT NULL,
	`value` integer NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `pieces`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_quantity_balance" CHECK("loan_items"."quantity" > 0 AND "loan_items"."returned" >= 0 AND "loan_items"."sold" >= 0 AND "loan_items"."returned" + "loan_items"."sold" <= "loan_items"."quantity"),
	CONSTRAINT "item_value_positive" CHECK("loan_items"."value" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_loan_items_loan_product` ON `loan_items` (`loan_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`merchant_id` text NOT NULL,
	`due` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_loans_workspace_merchant` ON `loans` (`workspace_id`,`merchant_id`);--> statement-breakpoint
CREATE INDEX `idx_loans_workspace_due` ON `loans` (`workspace_id`,`due`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name_key` text NOT NULL,
	`email` text NOT NULL,
	`portal_enabled` integer DEFAULT 0 NOT NULL,
	`portal_user_id` text,
	`payload` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_merchants_workspace_name` ON `merchants` (`workspace_id`,`name_key`);--> statement-breakpoint
CREATE INDEX `idx_merchants_portal_email` ON `merchants` (`workspace_id`,`email`);--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`at` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_movements_workspace_at` ON `movements` (`workspace_id`,`at`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`loan_id` text NOT NULL,
	`merchant_id` text NOT NULL,
	`audience` text NOT NULL,
	`at` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notices_workspace_recipient` ON `notices` (`workspace_id`,`merchant_id`,`audience`,`at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`receivable_id` text NOT NULL,
	`amount` integer NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receivable_id`) REFERENCES `receivables`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_nonzero" CHECK("payments"."amount" != 0)
);
--> statement-breakpoint
CREATE INDEX `idx_payments_workspace_receivable` ON `payments` (`workspace_id`,`receivable_id`);--> statement-breakpoint
CREATE TABLE `pieces` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`sku` text NOT NULL,
	`available` integer NOT NULL,
	`quarantine` integer NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "piece_available_nonnegative" CHECK("pieces"."available" >= 0),
	CONSTRAINT "piece_quarantine_nonnegative" CHECK("pieces"."quarantine" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pieces_workspace_sku` ON `pieces` (`workspace_id`,`sku`);--> statement-breakpoint
CREATE TABLE `receivables` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`loan_id` text NOT NULL,
	`merchant_id` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "receivable_balance" CHECK("receivables"."amount" > 0 AND "receivables"."paid_amount" >= 0 AND "receivables"."paid_amount" <= "receivables"."amount")
);
--> statement-breakpoint
CREATE INDEX `idx_receivables_workspace_merchant` ON `receivables` (`workspace_id`,`merchant_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_command` text DEFAULT '' NOT NULL,
	`settings` text NOT NULL,
	`created_at` text NOT NULL
);
