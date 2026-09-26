import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Mirrors the Clerk identity. Clerk is the source of truth for identity,
 * sessions, public role metadata, and billing; this table only mirrors it.
 *
 * `id` is the Clerk user ID (`user_...`) stored as text, so foreign keys from
 * purchases and lesson progress point at the Clerk identifier directly and no
 * second surrogate key is needed.
 */
export const userRole = ["student", "admin"] as const;
export const userRoleEnum = pgEnum("user_role", userRole);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").default("student").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("users_role_idx").on(table.role)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRole)[number];
