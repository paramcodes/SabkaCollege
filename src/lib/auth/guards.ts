import { canAccessAdmin } from "./roles";
import type { AppUser } from "@/src/lib/validation/user";

export const requireUser = async (
  user: AppUser | null | undefined,
): Promise<AppUser> => {
  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
};

export const requireAdmin = async (
  user: AppUser | null | undefined,
): Promise<AppUser> => {
  const authenticatedUser = await requireUser(user);

  if (!canAccessAdmin(authenticatedUser)) {
    throw new Error("Admin access required");
  }

  return authenticatedUser;
};
