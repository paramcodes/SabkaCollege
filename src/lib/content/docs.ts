import "server-only";

import { readContentIndex, resolveContentDirectory } from "./collection";
import {
  isValidContentSlug,
  sortByPublishedAtDescending,
  type ContentDocument,
  type DocumentFrontmatter,
} from "./frontmatter";

/**
 * `docs/guides` is a fixed directory constant. It is never derived from a
 * request value, so no URL can address a file outside this collection.
 */
const DOCS_DIRECTORY = resolveContentDirectory("docs/guides");

export type GuideSummary = DocumentFrontmatter;

export type Guide = {
  frontmatter: DocumentFrontmatter;
  /** Markdown body with the frontmatter block removed. */
  body: string;
  /** Repository-relative source path, for the "edit this page" note. */
  sourcePath: string;
  /** `#`-prefixed anchor for in-page navigation between guides. */
  anchor: string;
};

export { DOCS_DIRECTORY };

/**
 * Builds the slug index for `docs/guides`.
 *
 * Duplicate slugs and invalid frontmatter raise a `ContentValidationError`,
 * which fails `next build` instead of silently dropping a guide.
 */
const guideIndex = async (): Promise<Map<string, Guide>> => {
  const index = await readContentIndex(DOCS_DIRECTORY);

  return new Map(
    [...index.entries()].map(([slug, document]) => [
      slug,
      {
        frontmatter: document.frontmatter,
        body: document.body,
        sourcePath: document.sourcePath,
        anchor: `#${slug}`,
      },
    ]),
  );
};

/** Every guide, newest first. */
export async function getGuides(): Promise<GuideSummary[]> {
  "use cache";

  const index = await guideIndex();

  return sortByPublishedAtDescending<ContentDocument & Guide>([
    ...index.values(),
  ]).map((guide) => guide.frontmatter);
}

/**
 * Resolves a single guide.
 *
 * A malformed slug returns `null` before any filesystem work happens, and the
 * lookup only ever consults the index built from the directory itself.
 */
export async function getGuide(slug: string): Promise<Guide | null> {
  "use cache";

  if (!isValidContentSlug(slug)) {
    return null;
  }

  const index = await guideIndex();
  return index.get(slug) ?? null;
}

/** Every guide with its body, in the same newest-first order as `getGuides`. */
export async function getGuidesWithContent(): Promise<Guide[]> {
  "use cache";

  const index = await guideIndex();

  return sortByPublishedAtDescending<ContentDocument & Guide>([
    ...index.values(),
  ]);
}
