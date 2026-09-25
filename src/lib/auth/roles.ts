import type { AppUser } from "@/src/lib/validation/user";

export { normalizeUserRole } from "@/src/lib/validation/user";

export const canAccessAdmin = (
  user: Pick<AppUser, "role"> | null | undefined,
): boolean => user?.role === "admin";
