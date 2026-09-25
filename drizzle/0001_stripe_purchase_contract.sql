-- Expand: add the Stripe contract without invalidating existing purchases.
ALTER TABLE "courses" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint

-- Backfill: preserve every existing Clerk purchase with an explicit non-Stripe
-- sentinel. These values identify legacy rows; they are not Stripe IDs.
UPDATE "purchases"
SET "stripe_payment_intent_id" = 'legacy:' || "clerk_purchase_id"
WHERE "stripe_payment_intent_id" IS NULL;--> statement-breakpoint

-- Validate: fail closed if any row remained unresolved before the contract.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "purchases"
    WHERE "stripe_payment_intent_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot make stripe_payment_intent_id NOT NULL: unresolved purchase rows remain';
  END IF;
END
$$;--> statement-breakpoint

-- Contract: enforce the final schema only after backfill and validation.
ALTER TABLE "purchases" ALTER COLUMN "stripe_payment_intent_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "courses_stripe_price_id_idx" ON "courses" USING btree ("stripe_price_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_stripe_payment_intent_id_uidx" ON "purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
DROP INDEX "courses_clerk_price_id_idx";--> statement-breakpoint
DROP INDEX "purchases_clerk_purchase_id_uidx";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "clerk_product_id";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "clerk_price_id";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "clerk_purchase_id";
