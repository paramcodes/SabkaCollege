import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ContentValidationError,
  buildDocumentIndex,
  isValidContentSlug,
  isValidPublishedAt,
  parseContentDocument,
  sortByPublishedAtDescending,
  toDocuments,
  type ContentDocument,
} from "../../../src/lib/content/frontmatter";

const SOURCE_PATH = "docs/guides/example.md";

/** Wraps a body in an otherwise valid frontmatter block. */
const withFrontmatter = (block: string, body = "Body text."): string =>
  `---\n${block}\n---\n\n${body}\n`;

const VALID_BLOCK = [
  'title: "Adding a course"',
  'description: "Publish a course end to end."',
  'slug: "adding-a-course"',
  'publishedAt: "2026-03-02"',
  'readingTime: "10 min read"',
  'tags: ["admin", "content"]',
].join("\n");

/** Parses `block` and returns the thrown `issues`, or `null` when it parses. */
const issuesFor = (block: string): string[] | null => {
  try {
    parseContentDocument(withFrontmatter(block), SOURCE_PATH);
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(ContentValidationError);
    return (error as ContentValidationError).issues;
  }
};

const documentFor = (slug: string, publishedAt: string): ContentDocument => {
  const { frontmatter, body } = parseContentDocument(
    withFrontmatter(
      [
        `title: "Guide ${slug}"`,
        'description: "A guide."',
        `slug: "${slug}"`,
        `publishedAt: "${publishedAt}"`,
        'readingTime: "5 min read"',
        'tags: ["reference"]',
      ].join("\n"),
      `Body of ${slug}.`,
    ),
    `docs/guides/${slug}.md`,
  );

  return { frontmatter, body, sourcePath: `docs/guides/${slug}.md` };
};

describe("content frontmatter parsing", () => {
  it("parses a complete document and returns the body without the block", () => {
    const document = parseContentDocument(
      withFrontmatter(VALID_BLOCK, "Line one.\n\nLine two."),
      SOURCE_PATH,
    );

    expect(document.frontmatter).toEqual({
      title: "Adding a course",
      description: "Publish a course end to end.",
      slug: "adding-a-course",
      publishedAt: "2026-03-02",
      readingTime: "10 min read",
      tags: ["admin", "content"],
    });
    expect(document.body).toBe("Line one.\n\nLine two.\n");
  });

  it("parses CRLF files, double-quoted escapes, and single quotes", () => {
    const document = parseContentDocument(
      [
        "---",
        "title: Plain title",
        'description: "a \\"quoted\\" word"',
        "slug: 'page-map'",
        'publishedAt: "2024-02-29"',
        "readingTime: 7 min read",
        "tags:",
        "  - routes",
        "  - 'reference'",
        "---",
        "",
        "Body.",
        "",
      ].join("\r\n"),
      SOURCE_PATH,
    );

    expect(document.frontmatter).toEqual({
      title: "Plain title",
      description: 'a "quoted" word',
      slug: "page-map",
      publishedAt: "2024-02-29",
      readingTime: "7 min read",
      tags: ["routes", "reference"],
    });
    expect(document.body).toBe("Body.\n");
  });

  it("rejects a file that does not start with a frontmatter block", () => {
    expect(() => parseContentDocument("# No frontmatter", SOURCE_PATH)).toThrow(
      /must start with a "---" frontmatter block/,
    );
  });

  it("rejects a frontmatter block that is never closed", () => {
    expect(() =>
      parseContentDocument(`---\n${VALID_BLOCK}\n`, SOURCE_PATH),
    ).toThrow(/never closed/);
  });

  it("reports the source path in the error message", () => {
    expect(() => parseContentDocument("---\n", "docs/blog/broken.md")).toThrow(
      /docs\/blog\/broken\.md/,
    );
  });

  it("rejects an unknown key instead of ignoring it", () => {
    expect(issuesFor(`${VALID_BLOCK}\nauthor: "someone"`)).toContain(
      'unknown frontmatter key "author"',
    );
  });

  it("rejects a missing or blank required field", () => {
    expect(issuesFor(VALID_BLOCK.replace('title: "Adding a course"', ""))).toContain(
      '"title" must be a non-empty string',
    );
    expect(issuesFor(VALID_BLOCK.replace('readingTime: "10 min read"', ""))).toContain(
      '"readingTime" must be a non-empty string',
    );
  });

  it("rejects structural lines outside the supported YAML subset", () => {
    expect(issuesFor("  - orphan\ntitle: x")).toContain(
      "line 1: list item without a key",
    );
    expect(issuesFor("title: x\n   description: d")).toContain(
      "line 2: unexpected indentation",
    );
    expect(issuesFor("title: x\nnot a mapping")).toContain(
      'line 2: expected "key: value"',
    );
  });

  it("requires tags to be a non-empty list and removes duplicates", () => {
    expect(issuesFor(VALID_BLOCK.replace('tags: ["admin", "content"]', 'tags: "admin"'))).toContain(
      '"tags" must be a list of strings',
    );
    expect(issuesFor(VALID_BLOCK.replace('tags: ["admin", "content"]', "tags: []"))).toContain(
      '"tags" must contain at least one entry',
    );
    expect(
      parseContentDocument(
        withFrontmatter(VALID_BLOCK.replace('["admin", "content"]', '["admin", "admin"]')),
        SOURCE_PATH,
      ).frontmatter.tags,
    ).toEqual(["admin"]);
  });
});

describe("slug and date validation", () => {
  it("accepts slugs that are also safe path segments", () => {
    expect(isValidContentSlug("getting-started")).toBe(true);
    expect(isValidContentSlug("v2")).toBe(true);
    expect(isValidContentSlug("a".repeat(160))).toBe(true);
  });

  it("reports a blank slug as a missing value rather than a pattern failure", () => {
    expect(isValidContentSlug("")).toBe(false);
    expect(issuesFor(VALID_BLOCK.replace('slug: "adding-a-course"', 'slug: ""'))).toEqual([
      '"slug" must be a non-empty string',
    ]);
  });

  it.each([
    "-leading",
    "trailing-",
    "double--hyphen",
    "Upper-Case",
    "under_score",
    "with space",
    "page/slug",
    "../etc/passwd",
    "%2e%2e",
    "slug\nnewline",
    "a".repeat(161),
  ])("rejects the slug %j", (slug) => {
    expect(isValidContentSlug(slug)).toBe(false);
    expect(issuesFor(VALID_BLOCK.replace('slug: "adding-a-course"', `slug: "${slug}"`))).toContain(
      '"slug" must be lowercase letters, numbers, and single hyphens',
    );
  });

  it("rejects an invalid slug inside a document", () => {
    expect(() =>
      parseContentDocument(
        withFrontmatter(VALID_BLOCK.replace('"adding-a-course"', '"../secrets"')),
        SOURCE_PATH,
      ),
    ).toThrow(ContentValidationError);
  });

  it.each([
    ["2026-13-01", "month 13"],
    ["2026-00-10", "month 0"],
    ["2026-02-30", "day past the end of the month"],
    ["2026-02-29", "29 February in a non-leap year"],
    ["2026-1-1", "unpadded month and day"],
    ["20260101", "no separators"],
    ["2026-01-01T00:00:00Z", "a timestamp"],
  ])("rejects the publication date %s (%s)", (publishedAt) => {
    expect(isValidPublishedAt(publishedAt)).toBe(false);
    expect(issuesFor(VALID_BLOCK.replace('"2026-03-02"', `"${publishedAt}"`))).toContain(
      '"publishedAt" must be a real calendar date formatted YYYY-MM-DD',
    );
  });

  it("accepts a real leap day and rejects it in a non-leap year", () => {
    expect(isValidPublishedAt("2024-02-29")).toBe(true);
    expect(isValidPublishedAt("2026-02-29")).toBe(false);
  });
});

describe("collection indexing", () => {
  it("rejects two documents that share a slug", () => {
    expect(() =>
      buildDocumentIndex([
        documentFor("duplicate-slug", "2026-03-01"),
        documentFor("duplicate-slug", "2026-03-02"),
      ]),
    ).toThrow(/duplicate slug "duplicate-slug" already used by/);
  });

  it("names the first document that claimed the slug", () => {
    try {
      buildDocumentIndex([
        documentFor("shared", "2026-03-01"),
        documentFor("shared", "2026-03-02"),
      ]);
      expect.unreachable("expected a duplicate slug to be rejected");
    } catch (error) {
      const failure = error as ContentValidationError;
      expect(failure.sourcePath).toBe("docs/guides/shared.md");
      expect(failure.issues[0]).toContain("docs/guides/shared.md");
    }
  });

  it("keeps the same slug usable in two separate collections", () => {
    const guides = buildDocumentIndex([documentFor("getting-started", "2026-03-01")]);
    const blog = buildDocumentIndex([documentFor("getting-started", "2026-02-01")]);

    expect([...guides.keys()]).toEqual(["getting-started"]);
    expect([...blog.keys()]).toEqual(["getting-started"]);
  });

  it("sorts newest first without mutating the input", () => {
    const documents = [
      documentFor("oldest", "2025-12-31"),
      documentFor("newest", "2026-05-01"),
      documentFor("middle", "2026-01-01"),
    ];

    const sorted = sortByPublishedAtDescending(documents);

    expect(sorted.map((entry) => entry.frontmatter.slug)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
    expect(documents.map((entry) => entry.frontmatter.slug)).toEqual([
      "oldest",
      "newest",
      "middle",
    ]);
  });

  it("carries the source path through toDocuments", () => {
    const [document] = toDocuments([
      { sourcePath: "docs/blog/post.md", source: withFrontmatter(VALID_BLOCK) },
    ]);

    expect(document?.sourcePath).toBe("docs/blog/post.md");
    expect(document?.body).toBe("Body text.\n");
  });
});

describe("the guides that actually ship", () => {
  const guidesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../docs/guides",
  );

  it("has at least one guide on disk", () => {
    expect(readdirSync(guidesDirectory).filter((name) => name.endsWith(".md"))).not.toHaveLength(0);
  });

  it("parses every guide with unique slugs and real dates", () => {
    const documents = readdirSync(guidesDirectory)
      .filter((name) => name.endsWith(".md"))
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((name) => {
        const sourcePath = `docs/guides/${name}`;

        return {
          sourcePath,
          source: readFileSync(path.join(guidesDirectory, name), "utf8"),
        };
      });

    // Throws `ContentValidationError` on a malformed or duplicate guide, which
    // is the same failure `next build` would raise.
    const index = buildDocumentIndex(toDocuments(documents));

    expect(index.size).toBe(documents.length);

    for (const [slug, document] of index) {
      expect(slug).toBe(document.frontmatter.slug);
      expect(document.frontmatter.title.trim()).not.toBe("");
      expect(document.frontmatter.description.trim()).not.toBe("");
      expect(isValidPublishedAt(document.frontmatter.publishedAt)).toBe(true);
      expect(document.body.trim()).not.toBe("");
    }
  });
});
