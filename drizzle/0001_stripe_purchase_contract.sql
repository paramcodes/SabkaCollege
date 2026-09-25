DROP INDEX "courses_clerk_price_id_idx";--> statement-breakpoint
DROP INDEX "purchases_clerk_purchase_id_uidx";--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_payment_intent_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
CREATE INDEX "courses_stripe_price_id_idx" ON "courses" USING btree ("stripe_price_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_stripe_payment_intent_id_uidx" ON "purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "clerk_product_id";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "clerk_price_id";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "clerk_purchase_id";