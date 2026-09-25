import "server-only";

import {
  buildServerErrorEvent,
  type BoundaryErrorLike,
  type ServerErrorScope,
} from "./error-event";

/**
 * Server-only structured boundary logger.
 *
 * Server data loaders turn a query failure into a user-safe "temporarily
 * unavailable" state instead of throwing, which means without this logger the
 * failure would be invisible. Only a closed scope and a sanitized digest are
 * emitted: never a message, stack, SQL statement, Clerk session value, or
 * payment payload.
 *
 * The pure redaction rules live in `./error-event` so they can be unit tested
 * without importing a `server-only` module.
 */
export function logServerError(
  scope: ServerErrorScope,
  error: unknown,
): void {
  const boundaryError: BoundaryErrorLike =
    typeof error === "object" && error !== null
      ? (error as BoundaryErrorLike)
      : null;

  console.error(buildServerErrorEvent(scope, boundaryError));
}
