import "server-only";

import type { User } from "@clerk/backend";
import type {
  UserWebhookEvent,
  WebhookEvent,
} from "@clerk/nextjs/webhooks";

import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import {
  buildAppUserSyncValues,
  buildAppUserTombstoneValues,
  getRequiredEmail,
  getRequiredUserId,
  normalizeUserEmail,
  parseInitialAdminEmails,
  type AppUser,
  type AppUserSyncValues,
} from "@/src/lib/validation/user";

const joinName = (firstName: string | null, lastName: string | null) => {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
};

/**
 * `CLERK_INITIAL_ADMIN_EMAILS` is a bootstrap fallback for the very first
 * admins, not a role store. Reading it here keeps the value server-only: it is
 * never prefixed with `NEXT_PUBLIC_`, never serialized into a response, and
 * never reaches the browser. It is passed on as a bare flag, and
 * `resolveUserRole` applies it only when Clerk public metadata carries no
 * `role`: an explicit `role` in Clerk always wins, which is what makes both
 * demotion and typos in the list harmless. Clerk public metadata is the source
 * of truth for every account — see
 * `docs/guides/authentication-and-billing.md`.
 */
const isInitialAdminEmail = (email: string): boolean =>
  parseInitialAdminEmails(process.env.CLERK_INITIAL_ADMIN_EMAILS).has(
    normalizeUserEmail(email),
  );

const upsertAppUser = async (
  values: AppUserSyncValues,
): Promise<AppUser> => {
  const { id, ...updates } = values;
  const [appUser] = await db
    .insert(users)
    .values({ id, ...updates })
    .onConflictDoUpdate({
      target: users.id,
      set: updates,
    })
    .returning();

  if (!appUser) {
    throw new Error(`Failed to synchronize Clerk user ${id}`);
  }

  return appUser;
};

export const syncCurrentClerkUser = async (user: User): Promise<AppUser> => {
  const email = getRequiredEmail(
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress,
  );

  return upsertAppUser(
    buildAppUserSyncValues({
      id: getRequiredUserId(user.id),
      email,
      name: user.fullName ?? joinName(user.firstName, user.lastName),
      avatarUrl: user.imageUrl || null,
      publicMetadata: user.publicMetadata,
      isInitialAdmin: isInitialAdminEmail(email),
    }),
  );
};

export const syncClerkUser = async (event: UserWebhookEvent): Promise<void> => {
  if (event.type === "user.deleted") {
    await upsertAppUser(
      buildAppUserTombstoneValues(getRequiredUserId(event.data.id)),
    );
    return;
  }

  const primaryEmail =
    event.data.email_addresses.find(
      (email) => email.id === event.data.primary_email_address_id,
    ) ?? event.data.email_addresses[0];

  const email = getRequiredEmail(primaryEmail?.email_address);

  await upsertAppUser(
    buildAppUserSyncValues({
      id: getRequiredUserId(event.data.id),
      email,
      name: joinName(event.data.first_name, event.data.last_name),
      avatarUrl: event.data.image_url || null,
      publicMetadata: event.data.public_metadata,
      isInitialAdmin: isInitialAdminEmail(email),
    }),
  );
};

export const isUserWebhookEvent = (
  event: WebhookEvent,
): event is UserWebhookEvent =>
  event.type === "user.created" ||
  event.type === "user.updated" ||
  event.type === "user.deleted";
