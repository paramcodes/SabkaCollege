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
   * `CLERK_INITIAL_ADMIN_EMAILS`. It is a bootstrap for the first admins, not
   * a role store: Clerk public metadata stays authoritative otherwise.
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
 * Clerk public metadata is authoritative. The initial-admin allow-list only
 * promotes, so a listed email is an admin and every other user takes the role
 * Clerk reports.
 */
export const resolveUserRole = (
  publicMetadata: Record<string, unknown>,
  isInitialAdmin: boolean,
): UserRole =>
  isInitialAdmin ? "admin" : normalizeUserRole(publicMetadata.role);

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
