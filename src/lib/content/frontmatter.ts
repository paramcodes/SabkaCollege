/**
 * Frontmatter parsing and collection indexing for the Markdown content that
 * backs `/blog` and `/docs`.
 *
 * Everything in this module is pure so it can be unit tested without touching
 * the filesystem. Filesystem access lives in `blog.ts` and `docs.ts`.
 */

export type DocumentFrontmatter = {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  readingTime: string;
  tags: string[];
};

export type ContentDocument = {
  frontmatter: DocumentFrontmatter;
  /** Markdown body with the frontmatter block removed. */
  body: string;
  /** Repository-relative source path, used only for error messages. */
  sourcePath: string;
};

export type ParsedContentDocument = {
  frontmatter: DocumentFrontmatter;
  body: string;
};

export class ContentValidationError extends Error {
  readonly sourcePath: string;
  readonly issues: string[];

  constructor(sourcePath: string, issues: string[]) {
    super(
      `Invalid content frontmatter in ${sourcePath}: ${issues.join("; ")}`,
    );
    this.name = "ContentValidationError";
    this.sourcePath = sourcePath;
    this.issues = issues;
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLISHED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Slugs are also filesystem-safe segments, so they can never escape a directory. */
export const isValidContentSlug = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 160 &&
  SLUG_PATTERN.test(value);

export const isValidPublishedAt = (value: unknown): value is string => {
  if (typeof value !== "string" || !PUBLISHED_AT_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const unescapeDoubleQuoted = (value: string): string =>
  value.replace(/\\(.)/g, (_match, character: string) => {
    const escapes: Record<string, string> = {
      n: "\n",
      t: "\t",
      r: "\r",
      '"': '"',
      "\\": "\\",
    };

    return escapes[character] ?? character;
  });

const parseScalar = (raw: string): string => {
  const value = raw.trim();

  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return unescapeDoubleQuoted(value.slice(1, -1));
  }

  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  return value;
};

const parseInlineList = (raw: string): string[] | null => {
  const value = raw.trim();

  if (!value.startsWith("[") || !value.endsWith("]")) {
    return null;
  }

  const inner = value.slice(1, -1).trim();

  if (inner === "") {
    return [];
  }

  const items: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (const character of inner) {
    if (quote) {
      current += character;
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (character === ",") {
      items.push(parseScalar(current));
      current = "";
      continue;
    }

    current += character;
  }

  if (quote) {
    return null;
  }

  items.push(parseScalar(current));

  return items.map((item) => item.trim()).filter((item) => item.length > 0);
};

type RawFrontmatter = Map<string, string | string[]>;

/**
 * Parses the deliberately small YAML subset used by our content files:
 * `key: scalar`, `key: [a, b]`, and block sequences of `- item`.
 * Anything else (nested maps, anchors, multi-line scalars) is rejected rather
 * than half-supported.
 */
const parseFrontmatterBlock = (block: string, issues: string[]): RawFrontmatter => {
  const raw = new Map<string, string | string[]>();
  const lines = block.split("\n");
  let lastKey: string | null = null;

  lines.forEach((line, index) => {
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      return;
    }

    const sequenceItem = /^\s+-\s+(.*)$/.exec(line);

    if (sequenceItem) {
      if (lastKey === null) {
        issues.push(`line ${index + 1}: list item without a key`);
        return;
      }

      const existing = raw.get(lastKey);

      if (Array.isArray(existing)) {
        existing.push(parseScalar(sequenceItem[1] ?? ""));
        return;
      }

      if (existing === undefined) {
        raw.set(lastKey, [parseScalar(sequenceItem[1] ?? "")]);
        return;
      }

      issues.push(`line ${index + 1}: "${lastKey}" is already a scalar`);
      return;
    }

    if (/^\s/.test(line)) {
      issues.push(`line ${index + 1}: unexpected indentation`);
      return;
    }

    const entry = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);

    if (!entry) {
      issues.push(`line ${index + 1}: expected "key: value"`);
      return;
    }

    const key = entry[1] as string;
    const value = (entry[2] ?? "").trim();

    if (value === "") {
      raw.set(key, []);
      lastKey = key;
      return;
    }

    const inlineList = parseInlineList(value);

    if (inlineList) {
      raw.set(key, inlineList);
      lastKey = key;
      return;
    }

    raw.set(key, parseScalar(value));
    lastKey = null;
  });

  return raw;
};

const requireText = (
  raw: RawFrontmatter,
  key: keyof DocumentFrontmatter,
  issues: string[],
): string => {
  const value = raw.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`"${key}" must be a non-empty string`);
    return "";
  }

  return value.trim();
};

const requireTags = (raw: RawFrontmatter, issues: string[]): string[] => {
  const value = raw.get("tags");

  if (!Array.isArray(value)) {
    issues.push('"tags" must be a list of strings');
    return [];
  }

  const tags = value.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

  if (tags.length === 0) {
    issues.push('"tags" must contain at least one entry');
  }

  return [...new Set(tags)];
};

const FRONTMATTER_KEYS: ReadonlySet<string> = new Set([
  "title",
  "description",
  "slug",
  "publishedAt",
  "readingTime",
  "tags",
]);

/**
 * Splits a Markdown file into validated frontmatter and body.
 *
 * @throws {ContentValidationError} when the block is missing, malformed, or
 * holds an invalid slug or publication date.
 */
export const parseContentDocument = (
  source: string,
  sourcePath: string,
): ParsedContentDocument => {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const issues: string[] = [];

  if (lines[0]?.trim() !== "---") {
    throw new ContentValidationError(sourcePath, [
      'file must start with a "---" frontmatter block',
    ]);
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );

  if (closingIndex === -1) {
    throw new ContentValidationError(sourcePath, [
      'frontmatter block is never closed by "---"',
    ]);
  }

  const block = lines.slice(1, closingIndex).join("\n");
  const body = lines.slice(closingIndex + 1).join("\n");
  const raw = parseFrontmatterBlock(block, issues);

  for (const key of raw.keys()) {
    if (!FRONTMATTER_KEYS.has(key)) {
      issues.push(`unknown frontmatter key "${key}"`);
    }
  }

  const title = requireText(raw, "title", issues);
  const description = requireText(raw, "description", issues);
  const slug = requireText(raw, "slug", issues);
  const publishedAt = requireText(raw, "publishedAt", issues);
  const readingTime = requireText(raw, "readingTime", issues);
  const tags = requireTags(raw, issues);

  if (slug !== "" && !isValidContentSlug(slug)) {
    issues.push('"slug" must be lowercase letters, numbers, and single hyphens');
  }

  if (publishedAt !== "" && !isValidPublishedAt(publishedAt)) {
    issues.push('"publishedAt" must be a real calendar date formatted YYYY-MM-DD');
  }

  if (issues.length > 0) {
    throw new ContentValidationError(sourcePath, issues);
  }

  return {
    frontmatter: { title, description, slug, publishedAt, readingTime, tags },
    body: body.replace(/^\n+/, ""),
  };
};

const toDocument = (
  source: string,
  sourcePath: string,
): ContentDocument => ({
  ...parseContentDocument(source, sourcePath),
  sourcePath,
});

/**
 * Indexes a collection by slug, rejecting duplicates.
 *
 * Collections are independent: `docs/blog/getting-started.md` and
 * `docs/guides/getting-started.md` may share a slug because they are served
 * from different URLs.
 *
 * @throws {ContentValidationError} when two documents share a slug.
 */
export const buildDocumentIndex = (
  documents: ContentDocument[],
): Map<string, ContentDocument> => {
  const index = new Map<string, ContentDocument>();

  for (const document of documents) {
    const existing = index.get(document.frontmatter.slug);

    if (existing) {
      throw new ContentValidationError(document.sourcePath, [
        `duplicate slug "${document.frontmatter.slug}" already used by ${existing.sourcePath}`,
      ]);
    }

    index.set(document.frontmatter.slug, document);
  }

  return index;
};

export const sortByPublishedAtDescending = <T extends ContentDocument>(
  documents: T[],
): T[] =>
  [...documents].sort((left, right) =>
    right.frontmatter.publishedAt.localeCompare(
      left.frontmatter.publishedAt,
      "en",
    ),
  );

export const toDocuments = (sources: {
  sourcePath: string;
  source: string;
}[]): ContentDocument[] =>
  sources.map(({ source, sourcePath }) => toDocument(source, sourcePath));
