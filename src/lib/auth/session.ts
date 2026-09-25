import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { AppUser } from "@/src/lib/validation/user";
import { syncCurrentClerkUser } from "./user-sync";

export const getCurrentUserId = async (): Promise<string | null> => {
  const { userId } = await auth();
  return userId;
};

export const getCurrentAppUser = async (): Promise<AppUser | null> => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  return syncCurrentClerkUser(user);
};
