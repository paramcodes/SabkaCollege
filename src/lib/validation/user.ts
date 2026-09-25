import type { User as AppUser, UserRole } from "@/src/db/schema/users";

export type { AppUser, UserRole };

export type ClerkUserIdentity = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  publicMetadata: Record<string, unknown>;
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

export const buildAppUserSyncValues = (
  identity: ClerkUserIdentity,
  syncedAt = new Date(),
) => ({
  id: identity.id,
  email: identity.email,
  name: identity.name,
  avatarUrl: identity.avatarUrl,
  role: normalizeUserRole(identity.publicMetadata.role),
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
