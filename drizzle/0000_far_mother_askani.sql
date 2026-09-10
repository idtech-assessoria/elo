CREATE TABLE "commands" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"kind" text NOT NULL,
	"revision" integer NOT NULL,
	"result" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"guard" integer NOT NULL,
	CONSTRAINT "command_revision_guard" CHECK ("commands"."guard" = 1)
);
--> statement-breakpoint
ALTER TABLE "commands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"notice_id" text,
	"loan_id" text NOT NULL,
	"audience" text NOT NULL,
	"recipient" text NOT NULL,
	"recipient_name" text NOT NULL,
	"phone" text NOT NULL,
	"status" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"request_payload" text,
	"connection_revision" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_id" text,
	"provider" text,
	"error" text,
	"first_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"checked_at" timestamp with time zone,
	"whatsapp_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loan_events" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"payload" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loan_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gmail_setups" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gmail_setups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loan_items" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"returned" integer NOT NULL,
	"sold" integer NOT NULL,
	"value" integer NOT NULL,
	"payload" text NOT NULL,
	CONSTRAINT "item_quantity_balance" CHECK ("loan_items"."quantity" > 0 AND "loan_items"."returned" >= 0 AND "loan_items"."sold" >= 0 AND "loan_items"."returned" + "loan_items"."sold" <= "loan_items"."quantity"),
	CONSTRAINT "item_value_positive" CHECK ("loan_items"."value" > 0)
);
--> statement-breakpoint
ALTER TABLE "loan_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loans" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"due" date NOT NULL,
	"payload" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name_key" text NOT NULL,
	"email" text NOT NULL,
	"portal_enabled" integer DEFAULT 0 NOT NULL,
	"portal_user_id" uuid,
	"payload" text NOT NULL,
	CONSTRAINT "merchant_portal_flag" CHECK ("merchants"."portal_enabled" in (0,1))
);
--> statement-breakpoint
ALTER TABLE "merchants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_connections" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"encrypted_key" text NOT NULL,
	"sender" text NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"endpoint" text,
	"quota_remaining" integer,
	"enabled" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"verified_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messaging_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "movements" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"payload" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notices" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"loan_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"audience" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"payload" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"created_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"receivable_id" text NOT NULL,
	"amount" integer NOT NULL,
	"payload" text NOT NULL,
	CONSTRAINT "payment_nonzero" CHECK ("payments"."amount" != 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pieces" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"sku" text NOT NULL,
	"available" integer NOT NULL,
	"quarantine" integer NOT NULL,
	"payload" text NOT NULL,
	CONSTRAINT "piece_available_nonnegative" CHECK ("pieces"."available" >= 0),
	CONSTRAINT "piece_quarantine_nonnegative" CHECK ("pieces"."quarantine" >= 0)
);
--> statement-breakpoint
ALTER TABLE "pieces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "receivables" (
	"created_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"loan_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"amount" integer NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"payload" text NOT NULL,
	CONSTRAINT "receivable_balance" CHECK ("receivables"."amount" > 0 AND "receivables"."paid_amount" >= 0 AND "receivables"."paid_amount" <= "receivables"."amount")
);
--> statement-breakpoint
ALTER TABLE "receivables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"owner_email" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"last_command" text DEFAULT '' NOT NULL,
	"settings" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "commands" ADD CONSTRAINT "commands_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_events" ADD CONSTRAINT "loan_events_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_setups" ADD CONSTRAINT "gmail_setups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_items" ADD CONSTRAINT "loan_items_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_items" ADD CONSTRAINT "loan_items_product_id_pieces_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pieces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_connections" ADD CONSTRAINT "messaging_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_commands_workspace_at" ON "commands" USING btree ("workspace_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_outbox_notice" ON "email_outbox" USING btree ("workspace_id","notice_id");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_queue" ON "email_outbox" USING btree ("workspace_id","status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_recipient" ON "email_outbox" USING btree ("workspace_id","recipient");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_notice_id" ON "email_outbox" USING btree ("notice_id");--> statement-breakpoint
CREATE INDEX "idx_loan_events_loan_at" ON "loan_events" USING btree ("loan_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_loan_items_loan_product" ON "loan_items" USING btree ("loan_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_loan_items_product" ON "loan_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_loans_workspace_merchant" ON "loans" USING btree ("workspace_id","merchant_id");--> statement-breakpoint
CREATE INDEX "idx_loans_workspace_due" ON "loans" USING btree ("workspace_id","due");--> statement-breakpoint
CREATE INDEX "idx_loans_merchant" ON "loans" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_merchants_workspace_name" ON "merchants" USING btree ("workspace_id","name_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_merchants_portal_email" ON "merchants" USING btree ("workspace_id","email") WHERE "merchants"."portal_enabled" = 1;--> statement-breakpoint
CREATE INDEX "idx_movements_workspace_at" ON "movements" USING btree ("workspace_id","at");--> statement-breakpoint
CREATE INDEX "idx_notices_workspace_recipient" ON "notices" USING btree ("workspace_id","merchant_id","audience","at");--> statement-breakpoint
CREATE INDEX "idx_notices_loan" ON "notices" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_notices_merchant" ON "notices" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_payments_workspace_receivable" ON "payments" USING btree ("workspace_id","receivable_id");--> statement-breakpoint
CREATE INDEX "idx_payments_receivable" ON "payments" USING btree ("receivable_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pieces_workspace_sku" ON "pieces" USING btree ("workspace_id","sku");--> statement-breakpoint
CREATE INDEX "idx_receivables_workspace_merchant" ON "receivables" USING btree ("workspace_id","merchant_id");--> statement-breakpoint
CREATE INDEX "idx_receivables_loan" ON "receivables" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_receivables_merchant" ON "receivables" USING btree ("merchant_id");