/**
 * Pure, isomorphic redaction helpers shared by the client route boundaries and
 * the server-only structured logger.
 *
 * Nothing in this module may read `error.message`, `error.stack`, request data,
 * SQL, Clerk session material, or payment payloads. The only value that ever
 * leaves a boundary is a sanitized framework digest, and the only other value
 * is a scope drawn from a closed union.
 */

/** Client route boundaries that report a `route.error` event. */
export const CLIENT_BOUNDARY_SCOPES = [
  "admin.workspace",
  "catalog.course",
  "learning.course",
  "learning.lesson",
  "student.dashboard",
] as const;

export type ClientBoundaryScope = (typeof CLIENT_BOUNDARY_SCOPES)[number];

/** Server data loaders that report a `server.error` event. */
export const SERVER_ERROR_SCOPES = [
  "catalog.course",
  "catalog.course.access",
  "catalog.courses",
  "catalog.preview",
  "catalog.syllabus",
  "marketing.featured-courses",
] as const;

export type ServerErrorScope = (typeof SERVER_ERROR_SCOPES)[number];

/**
 * The only shape a boundary is allowed to read from an error. Both fields that
 * exist on a Next.js boundary error are deliberately absent here.
 */
export type BoundaryErrorLike = { digest?: unknown } | null | undefined;

/**
 * Digests are opaque framework correlation ids, not user data. Accept a short
 * URL-safe token and nothing else, so a message or provider secret can never be
 * smuggled through the digest field.
 */
const DIGEST_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Rejects digests that look like a credential. The charset alone is not enough:
 * `sk_test_...` and `whsec_...` are made of allowed characters.
 */
const SECRET_PREFIX_PATTERN =
  /^(?:sk|rk|whsec|cs|pi|pk|sess|api|auth|clerk|key|token|secret)[_-]/i;

/**
 * Returns the digest only when it is a short correlation token, otherwise
 * `null`. Never returns a message, stack, URL, or provider payload.
 */
export function sanitizeDigest(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const digest = value.trim();

  if (!DIGEST_PATTERN.test(digest)) {
    return null;
  }

  if (SECRET_PREFIX_PATTERN.test(digest)) {
    return null;
  }

  return digest;
}

export type ServerErrorEvent = {
  event: "server.error";
  scope: ServerErrorScope;
  digest: string | null;
};

/**
 * Builds the only payload a server data loader may log. Callers pass the caught
 * error so a correlation id survives, and nothing else leaves this function.
 */
export function buildServerErrorEvent(
  scope: ServerErrorScope,
  error: BoundaryErrorLike,
): ServerErrorEvent {
  return {
    event: "server.error",
    scope,
    digest: sanitizeDigest(error?.digest),
  };
}

export type BoundaryLogEvent = {
  event: "route.error";
  scope: ClientBoundaryScope;
  digest: string | null;
};

/**
 * Builds the client-safe boundary event. Messages, stacks, and request details
 * are intentionally dropped so a failure never leaks SQL, Clerk tokens, or
 * payment payloads into the browser.
 */
export function buildBoundaryLog(
  scope: ClientBoundaryScope,
  error: BoundaryErrorLike,
): BoundaryLogEvent {
  return {
    event: "route.error",
    scope,
    digest: sanitizeDigest(error?.digest),
  };
}
