ALTER TABLE "loan_items" DROP CONSTRAINT "item_value_positive";--> statement-breakpoint
ALTER TABLE "loan_items" ADD CONSTRAINT "item_value_nonnegative" CHECK ("loan_items"."value" >= 0);