import { constants } from "node:fs";
import { accessSync, statSync } from "node:fs";

/**
 * Playwright's own browser download is NOT vendored in this repository, and
 * `bun run install:chromium` is not part of the setup. The only supported way
 * to drive a browser here is the Chrome/Chromium already installed on the
 * machine. This module is the single place that knows how to find it, so the
 * e2e suite, the Playwright config, and the screenshot script all agree on
 * what "the browser is available" means.
 *
 * Resolution order:
 *   1. `PLAYWRIGHT_CHROME_EXECUTABLE` / `CHROME_PATH` env override.
 *   2. A fixed list of well-known install locations.
 *
 * A candidate only counts when it is a real, executable file. Anything else
 * (a dangling symlink, a directory, a non-executable stub) returns `null` so
 * callers can skip honestly instead of failing with a launch error.
 */

const ENV_OVERRIDES = ["PLAYWRIGHT_CHROME_EXECUTABLE", "CHROME_PATH"] as const;

const WELL_KNOWN_PATHS = [
  // Debian/Ubuntu, and the `/etc/alternatives` symlink it usually points at.
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  // Debian/Ubuntu Chromium packages and the snap wrapper.
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  // Fedora/RHEL.
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  // macOS.
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
] as const;

const isExecutableFile = (path: string): boolean => {
  try {
    // `statSync` follows symlinks, which is what we want: `/usr/bin/google-chrome`
    // is an alternatives symlink to a versioned binary.
    if (!statSync(path).isFile()) {
      return false;
    }
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/** Returns the first usable Chrome/Chromium binary, or `null` when none exists. */
export const resolveSystemChrome = (): string | null => {
  for (const variable of ENV_OVERRIDES) {
    const override = process.env[variable];

    if (override && isExecutableFile(override)) {
      return override;
    }
  }

  for (const candidate of WELL_KNOWN_PATHS) {
    if (isExecutableFile(candidate)) {
      return candidate;
    }
  }

  return null;
};

/** A human-readable reason for a skip, mentioning the override that fixes it. */
export const SYSTEM_CHROME_MISSING_REASON =
  "No system Chrome/Chromium binary found. Install Google Chrome (Debian/Ubuntu: " +
  "`sudo apt-get install -y google-chrome-stable`) or point " +
  "PLAYWRIGHT_CHROME_EXECUTABLE at an existing executable.";
