import type { User as AppUser, UserRole } from "@/src/db/schema/users";

export type { AppUser, UserRole };

export type ClerkUserIdentity = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  publicMetadata: Record<string, unknown>;
  /**
   * Set by the server-only sync layer when the user's email is in
   * `CLERK_INITIAL_ADMIN_EMAILS` and Clerk public metadata carries no `role`
   * of its own. It is a bootstrap for the first admins, not a role store: an
   * explicit Clerk `role` always wins, so an operator can demote a listed
   * account through Clerk.
   */
  isInitialAdmin?: boolean;
};

export type AppUserSyncValues = Pick<
  AppUser,
  | "id"
  | "email"
  | "name"
  | "avatarUrl"
  | "role"
  | "lastSyncedAt"
  | "updatedAt"
>;

export const normalizeUserRole = (value: unknown): UserRole =>
  value === "admin" ? "admin" : "student";

export const normalizeUserEmail = (value: string): string =>
  value.trim().toLowerCase();

/**
 * Reads an explicit `role` out of Clerk public metadata. Returns `null` — not
 * a fallback role — when the key is absent, so callers can tell "Clerk said
 * student" apart from "Clerk said nothing".
 */
const readClerkRole = (
  publicMetadata: Record<string, unknown>,
): UserRole | null => {
  const role = publicMetadata.role;
  return role === "admin" || role === "student" ? role : null;
};

/**
 * Parse the comma-separated `CLERK_INITIAL_ADMIN_EMAILS` allow-list. An unset
 * or empty value yields an empty set, so a deployment that never configures the
 * variable promotes nobody. The value is read from the server-only sync layer,
 * never from a `NEXT_PUBLIC_` variable.
 */
export const parseInitialAdminEmails = (
  value: string | undefined,
): ReadonlySet<string> =>
  new Set(
    (value ?? "")
      .split(",")
      .map(normalizeUserEmail)
      .filter((email) => email.length > 0),
  );

/**
 * Clerk public metadata is authoritative. `CLERK_INITIAL_ADMIN_EMAILS` only
 * bootstraps users whose metadata carries no `role` key at all, so the first
 * admins can be created before any metadata is set — and so setting
 * `role: "student"` in Clerk demotes a listed account instead of being
 * silently overridden.
 */
export const resolveUserRole = (
  publicMetadata: Record<string, unknown>,
  isInitialAdmin: boolean,
): UserRole => {
  const clerkRole = readClerkRole(publicMetadata);

  if (clerkRole) {
    return clerkRole;
  }

  return isInitialAdmin ? "admin" : "student";
};

export const buildAppUserSyncValues = (
  identity: ClerkUserIdentity,
  syncedAt = new Date(),
) => ({
  id: identity.id,
  email: identity.email,
  name: identity.name,
  avatarUrl: identity.avatarUrl,
  role: resolveUserRole(identity.publicMetadata, identity.isInitialAdmin === true),
  lastSyncedAt: syncedAt,
  updatedAt: syncedAt,
});

export const buildAppUserTombstoneValues = (
  userId: string,
  syncedAt = new Date(),
): AppUserSyncValues => ({
  id: userId,
  email: `tombstone+${userId}@users.invalid`,
  name: null,
  avatarUrl: null,
  role: "student",
  lastSyncedAt: syncedAt,
  updatedAt: syncedAt,
});

export const getRequiredUserId = (value: string | null | undefined): string => {
  if (!value) {
    throw new Error("Clerk user ID is required");
  }

  return value;
};

export const getRequiredEmail = (value: string | null | undefined): string => {
  if (!value) {
    throw new Error("A primary email address is required to synchronize a user");
  }

  return value;
};
