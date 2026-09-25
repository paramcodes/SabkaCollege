export const ADMIN_PAGE_SIZE = 50;
export const MAX_ADMIN_PAGE = 10_000;

export function normalizeAdminPage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);

  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(MAX_ADMIN_PAGE, Math.floor(parsed)));
}
