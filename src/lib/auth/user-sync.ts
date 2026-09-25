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
  type AppUser,
  type AppUserSyncValues,
} from "@/src/lib/validation/user";

const joinName = (firstName: string | null, lastName: string | null) => {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
};

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
  const email =
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  return upsertAppUser(
    buildAppUserSyncValues({
      id: getRequiredUserId(user.id),
      email: getRequiredEmail(email),
      name: user.fullName ?? joinName(user.firstName, user.lastName),
      avatarUrl: user.imageUrl || null,
      publicMetadata: user.publicMetadata,
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

  await upsertAppUser(
    buildAppUserSyncValues({
      id: getRequiredUserId(event.data.id),
      email: getRequiredEmail(primaryEmail?.email_address),
      name: joinName(event.data.first_name, event.data.last_name),
      avatarUrl: event.data.image_url || null,
      publicMetadata: event.data.public_metadata,
    }),
  );
};

export const isUserWebhookEvent = (
  event: WebhookEvent,
): event is UserWebhookEvent =>
  event.type === "user.created" ||
  event.type === "user.updated" ||
  event.type === "user.deleted";
