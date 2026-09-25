import type { AppUser } from "@/src/lib/validation/user";
import { canAccessAdmin } from "./roles";
import { getCurrentAppUser } from "./session";

export const requireUser = async (): Promise<AppUser> => {
  const user = await getCurrentAppUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
};

export const requireAdmin = async (): Promise<AppUser> => {
  const user = await getCurrentAppUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  if (!canAccessAdmin(user)) {
    throw new Error("Admin access required");
  }

  return user;
};
