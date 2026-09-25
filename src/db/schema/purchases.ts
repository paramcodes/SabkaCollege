import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { courses } from "./courses";
import { users } from "./users";

export const purchaseStatus = [
  "pending",
  "paid",
  "refunded",
  "revoked",
] as const;
export const purchaseStatusEnum = pgEnum("purchase_status", purchaseStatus);

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkPurchaseId: text("clerk_purchase_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("INR").notNull(),
    status: purchaseStatusEnum("status").default("pending").notNull(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("purchases_clerk_purchase_id_uidx").on(table.clerkPurchaseId),
    index("purchases_user_id_idx").on(table.userId),
    index("purchases_course_id_idx").on(table.courseId),
    check("purchases_amount_cents_nonnegative", sql`${table.amountCents} >= 0`),
  ],
);

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
