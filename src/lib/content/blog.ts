import "server-only";

import { readContentIndex, resolveContentDirectory } from "./collection";
import {
  isValidContentSlug,
  sortByPublishedAtDescending,
  type ContentDocument,
  type DocumentFrontmatter,
} from "./frontmatter";

/**
 * `docs/blog` is a fixed directory constant. It is never derived from a
 * request value, so no URL can address a file outside this collection.
 */
const BLOG_DIRECTORY = resolveContentDirectory("docs/blog");

export type BlogSummary = DocumentFrontmatter;

export type BlogPost = {
  frontmatter: DocumentFrontmatter;
  /** Markdown body with the frontmatter block removed. */
  body: string;
  /** Repository-relative source path, for the "edit this page" link. */
  sourcePath: string;
};

export { BLOG_DIRECTORY };

/**
 * Builds the slug index for `docs/blog`.
 *
 * Duplicate slugs and invalid frontmatter raise a `ContentValidationError`,
 * which fails `next build` instead of silently dropping a page.
 */
const blogIndex = async (): Promise<Map<string, BlogPost>> => {
  const index = await readContentIndex(BLOG_DIRECTORY);

  return new Map(
    [...index.entries()].map(([slug, document]) => [
      slug,
      {
        frontmatter: document.frontmatter,
        body: document.body,
        sourcePath: document.sourcePath,
      },
    ]),
  );
};

/** Every published blog article, newest first. */
export async function getBlogPosts(): Promise<BlogSummary[]> {
  "use cache";

  const index = await blogIndex();

  return sortByPublishedAtDescending<ContentDocument & BlogPost>([
    ...index.values(),
  ]).map((post) => post.frontmatter);
}

/**
 * Resolves a single published article.
 *
 * A malformed slug returns `null` before any filesystem work happens, and the
 * lookup only ever consults the index built from the directory itself. Because
 * the index is derived from the files on disk, a request can neither address
 * an outside file nor skip frontmatter validation.
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  "use cache";

  if (!isValidContentSlug(slug)) {
    return null;
  }

  const index = await blogIndex();
  return index.get(slug) ?? null;
}
