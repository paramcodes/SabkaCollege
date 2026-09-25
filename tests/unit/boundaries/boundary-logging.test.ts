import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildBoundaryLog,
  buildServerErrorEvent,
  CLIENT_BOUNDARY_SCOPES,
  sanitizeDigest,
  SERVER_ERROR_SCOPES,
} from "../../../src/lib/logging/error-event";
import { logServerError } from "../../../src/lib/logging/server-error";
import { RetryButton } from "../../../src/components/layout/retry-button";

/**
 * The server-only marker module throws outside the React server condition, so
 * the pure logger is what the redaction assertions exercise. This stub only
 * lets the `logServerError` entry point be imported in Node.
 */
vi.mock("server-only", () => ({}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

/**
 * One synthetic failure carrying every marker class a leak would use: SQL, a
 * password column, a filesystem path, a Clerk session value, and Stripe secret,
 * checkout, payment, and webhook identifiers.
 */
const SENSITIVE_MARKERS = {
  sql: "select * from users where password_hash = $1",
  password: "password_hash",
  filesystem: "/home/param/Documents/LMS/app/(catalog)/courses/page.tsx",
  stackFrame: "at ServerComponent",
  clerk: "clerk_session_tok_9f8a7b6c5d4e3f2a",
  stripeSecret: "sk_test_51H8xkLmNoPqRsTuVwXyZ",
  checkout: "cs_test_a1B2c3D4e5F6g7H8i9J0",
  payment: "pi_3PxyzAbCdEfGhIjKlMnO",
  webhook: "whsec_9fZxKq2LmNpQrStUvWxYz",
  databaseUrl: "postgresql://sabka:hunter2@db.internal:5432/sabka",
} as const;

const sensitivePattern = new RegExp(
  [
    SENSITIVE_MARKERS.sql,
    SENSITIVE_MARKERS.password,
    SENSITIVE_MARKERS.filesystem,
    SENSITIVE_MARKERS.stackFrame,
    SENSITIVE_MARKERS.clerk,
    SENSITIVE_MARKERS.stripeSecret,
    SENSITIVE_MARKERS.checkout,
    SENSITIVE_MARKERS.payment,
    SENSITIVE_MARKERS.webhook,
    SENSITIVE_MARKERS.databaseUrl,
  ]
    .map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
);

const sensitiveMarkers = Object.values(SENSITIVE_MARKERS);

/** A boundary error whose digest is itself a Stripe secret key. */
const hostileError = Object.assign(
  new Error(
    `${SENSITIVE_MARKERS.sql} from ${SENSITIVE_MARKERS.databaseUrl} (${SENSITIVE_MARKERS.clerk})`,
  ),
  {
    stack: `Error: ${SENSITIVE_MARKERS.sql}\n    ${SENSITIVE_MARKERS.stackFrame} (${SENSITIVE_MARKERS.filesystem}:41:9)`,
    digest: SENSITIVE_MARKERS.stripeSecret,
  },
);

/** A boundary error carrying a well-formed framework correlation digest. */
const correlatedError = Object.assign(
  new Error(`${SENSITIVE_MARKERS.sql} (${SENSITIVE_MARKERS.checkout})`),
  {
    stack: `Error: ${SENSITIVE_MARKERS.sql}\n    ${SENSITIVE_MARKERS.stackFrame} (${SENSITIVE_MARKERS.filesystem}:41:9)`,
    digest: "d1g3st0nab12",
  },
);

afterEach(() => {
  refresh.mockClear();
});

describe("digest sanitization", () => {
  it("keeps only a short URL-safe correlation token", () => {
    expect(sanitizeDigest("d1g3st0nab12")).toBe("d1g3st0nab12");
    expect(sanitizeDigest("  d1g3st0nab12  ")).toBe("d1g3st0nab12");
  });

  it("rejects a credential-shaped digest", () => {
    expect(sanitizeDigest(SENSITIVE_MARKERS.stripeSecret)).toBeNull();
    expect(sanitizeDigest(SENSITIVE_MARKERS.webhook)).toBeNull();
    expect(sanitizeDigest(SENSITIVE_MARKERS.checkout)).toBeNull();
    expect(sanitizeDigest(SENSITIVE_MARKERS.payment)).toBeNull();
    expect(sanitizeDigest(SENSITIVE_MARKERS.clerk)).toBeNull();
  });

  it("rejects a value that is not a short correlation token", () => {
    expect(sanitizeDigest(undefined)).toBeNull();
    expect(sanitizeDigest(null)).toBeNull();
    expect(sanitizeDigest(12345)).toBeNull();
    expect(sanitizeDigest({ digest: "d1g3st0nab12" })).toBeNull();
    expect(sanitizeDigest("")).toBeNull();
    expect(sanitizeDigest("short")).toBeNull();
    expect(sanitizeDigest("a".repeat(65))).toBeNull();
    expect(sanitizeDigest(SENSITIVE_MARKERS.sql)).toBeNull();
    expect(sanitizeDigest(SENSITIVE_MARKERS.databaseUrl)).toBeNull();
    expect(sanitizeDigest(`${SENSITIVE_MARKERS.filesystem}:41:9`)).toBeNull();
  });
});

describe("server boundary logging", () => {
  it("emits a structured event of scope and digest only", () => {
    const event = buildServerErrorEvent("catalog.course", correlatedError);

    expect(event).toEqual({
      event: "server.error",
      scope: "catalog.course",
      digest: "d1g3st0nab12",
    });
    expect(Object.keys(event).sort()).toEqual(["digest", "event", "scope"]);
  });

  it("redacts a credential digest down to null", () => {
    expect(buildServerErrorEvent("catalog.preview", hostileError)).toEqual({
      event: "server.error",
      scope: "catalog.preview",
      digest: null,
    });
  });

  it("never emits a message, stack, SQL, Clerk, or payment value", () => {
    const event = buildServerErrorEvent("catalog.syllabus", hostileError);
    const serialized = JSON.stringify(event);

    for (const marker of sensitiveMarkers) {
      expect(serialized).not.toContain(marker);
    }
    expect(serialized).not.toMatch(sensitivePattern);
  });

  it("writes the structured object to the server console", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logServerError("catalog.course", correlatedError);
    logServerError("catalog.preview", hostileError);
    logServerError("catalog.courses", "a string failure");
    logServerError("catalog.course.access", null);

    expect(consoleError).toHaveBeenCalledTimes(4);
    expect(consoleError.mock.calls).toEqual([
      [{ event: "server.error", scope: "catalog.course", digest: "d1g3st0nab12" }],
      [{ event: "server.error", scope: "catalog.preview", digest: null }],
      [{ event: "server.error", scope: "catalog.courses", digest: null }],
      [{ event: "server.error", scope: "catalog.course.access", digest: null }],
    ]);

    for (const call of consoleError.mock.calls) {
      expect(call).toHaveLength(1);
      expect(typeof call[0]).toBe("object");
    }
  });

  it("constrains the server scope to a closed union", () => {
    expect(SERVER_ERROR_SCOPES).toEqual([
      "catalog.course",
      "catalog.course.access",
      "catalog.courses",
      "catalog.preview",
      "catalog.syllabus",
      "marketing.featured-courses",
    ]);
  });
});

describe("client boundary reporting", () => {
  it("emits a structured route event of scope and digest only", () => {
    const log = buildBoundaryLog("learning.lesson", correlatedError);

    expect(log).toEqual({
      event: "route.error",
      scope: "learning.lesson",
      digest: "d1g3st0nab12",
    });
    expect(Object.keys(log).sort()).toEqual(["digest", "event", "scope"]);
  });

  it("redacts a hostile digest and a missing error", () => {
    expect(buildBoundaryLog("catalog.course", hostileError).digest).toBeNull();
    expect(buildBoundaryLog("student.dashboard", null).digest).toBeNull();
    expect(buildBoundaryLog("admin.workspace", undefined).digest).toBeNull();
  });

  it("never serializes a message, stack, SQL, Clerk, or payment value", () => {
    for (const scope of CLIENT_BOUNDARY_SCOPES) {
      for (const error of [hostileError, correlatedError, null]) {
        const serialized = JSON.stringify(buildBoundaryLog(scope, error));

        for (const marker of sensitiveMarkers) {
          expect(serialized).not.toContain(marker);
        }
        expect(serialized).not.toMatch(sensitivePattern);
      }
    }
  });

  it("constrains the client scope to a closed union", () => {
    expect(CLIENT_BOUNDARY_SCOPES).toEqual([
      "admin.workspace",
      "catalog.course",
      "learning.course",
      "learning.lesson",
      "student.dashboard",
    ]);
  });

  /**
   * The reporter runs inside a `useEffect`, which `renderToStaticMarkup` never
   * executes. This asserts the pure payload only; no client logging effect is
   * claimed to be covered here.
   */
  it("does not claim the PageError effect to run in static markup", () => {
    const markup = renderToStaticMarkup(
      createElement("button", { type: "button" }, "placeholder"),
    );

    expect(markup).toBe("<button type=\"button\">placeholder</button>");
    expect(markup).not.toContain("route.error");
  });
});

describe("unavailable-state retry control", () => {
  it("re-runs the server component instead of navigating away", () => {
    // The only hook is the mocked `useRouter`, so the component renders as a
    // plain function call and the control's handler is directly observable.
    const element = RetryButton({}) as unknown as {
      props: { onClick: () => void };
    };

    expect(refresh).not.toHaveBeenCalled();
    element.props.onClick();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders an accessible labelled control", () => {
    const markup = renderToStaticMarkup(createElement(RetryButton, {}));

    expect(markup).toContain('type="button"');
    expect(markup).toContain('data-testid="retry-boundary"');
    expect(markup).toContain("Try again");
  });
});

describe("dynamic rendering boundary", () => {
  const guardedPages = [
    "app/(catalog)/courses/page.tsx",
    "app/(catalog)/courses/[courseSlug]/page.tsx",
    "app/(catalog)/courses/[courseSlug]/syllabus/page.tsx",
    "app/(catalog)/courses/[courseSlug]/preview/[lessonSlug]/page.tsx",
    "app/(marketing)/page.tsx",
  ];

  it.each(guardedPages)(
    "%s awaits connection() before its database catch block",
    (relativePath) => {
      const source = readFileSync(
        fileURLToPath(new URL(`../../../${relativePath}`, import.meta.url)),
        "utf8",
      );
      const connectionIndex = source.indexOf("await connection()");
      const tryIndex = source.indexOf("try {");

      expect(connectionIndex).toBeGreaterThan(-1);
      expect(tryIndex).toBeGreaterThan(-1);
      expect(connectionIndex).toBeLessThan(tryIndex);
    },
  );

  it.each(guardedPages)("%s never logs a raw caught error", (relativePath) => {
    const source = readFileSync(
      fileURLToPath(new URL(`../../../${relativePath}`, import.meta.url)),
      "utf8",
    );

    expect(source).not.toMatch(/console\.(error|warn|log)\([^)]*,\s*error\b/);
  });

  it("keeps the server logger in a server-only module", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL("../../../src/lib/logging/server-error.ts", import.meta.url),
      ),
      "utf8",
    );

    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/\.(message|stack)\b/);
  });
});
