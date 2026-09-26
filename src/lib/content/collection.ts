import "server-only";

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDocumentIndex,
  toDocuments,
  type ContentDocument,
} from "./frontmatter";

const moduleRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

/**
 * Resolves the repository root.
 *
 * Next.js may execute this module from a compiled output directory, so the
 * module location alone is not reliable. The first candidate that actually
 * contains `package.json` wins, which keeps `sourcePath` values correct in
 * `next dev`, `next build`, and `next start` alike.
 */
const resolveRepositoryRoot = (): string => {
  for (const candidate of [process.cwd(), moduleRoot]) {
    if (existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  return process.cwd();
};

const repositoryRoot = resolveRepositoryRoot();

/** Repository-relative, POSIX-style path used in error messages and docs. */
export const toRepositoryPath = (absolutePath: string): string =>
  path.relative(repositoryRoot, absolutePath).split(path.sep).join("/");

/**
 * Resolves one of the fixed content directories.
 *
 * The relative path is always a module constant, never a request value. The
 * resolver fails loudly when the directory is missing instead of silently
 * serving an empty collection, so a renamed folder fails the build.
 */
export const resolveContentDirectory = (relativeDirectory: string): string => {
  const fromCwd = path.resolve(process.cwd(), relativeDirectory);
  const fromModule = path.resolve(moduleRoot, relativeDirectory);

  for (const candidate of [fromCwd, fromModule]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Content directory "${relativeDirectory}" was not found. Looked in ${fromCwd} and ${fromModule}.`,
  );
};

/**
 * Reads every Markdown file in a fixed content directory.
 *
 * The directory is always a module constant, never a request value, and the
 * entries are sorted so builds are reproducible. Nested directories are
 * ignored on purpose: a flat folder keeps slugs, URLs, and file names
 * identical, which is what makes the static path list trustworthy.
 */
export const readContentDirectory = async (
  directory: string,
): Promise<ContentDocument[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  const documents = await Promise.all(
    markdownFiles.map(async (fileName) => {
      const absolutePath = path.join(directory, fileName);

      return {
        source: await readFile(absolutePath, "utf8"),
        sourcePath: toRepositoryPath(absolutePath),
      };
    }),
  );

  return toDocuments(documents);
};

/**
 * Builds a slug index for a content directory and fails the build on
 * duplicate slugs or invalid frontmatter.
 */
export const readContentIndex = async (
  directory: string,
): Promise<Map<string, ContentDocument>> =>
  buildDocumentIndex(await readContentDirectory(directory));
