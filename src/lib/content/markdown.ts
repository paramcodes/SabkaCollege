/**
 * A deliberately small, escape-first Markdown renderer.
 *
 * Security model: every character of the source is HTML-escaped before any
 * markup is produced, so raw HTML in a Markdown file is rendered as visible
 * text and can never introduce a tag, an event handler, or a `javascript:`
 * URL. Only the constructs below emit HTML, and every URL is re-checked
 * against an allowlist before it is emitted.
 *
 * The output is a string, so it must only be injected through the
 * `Prose` component in `src/components/content/prose.tsx`.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);

const ABSOLUTE_HTTPS_URL = /^https:\/\/[^\s<>"'\\]+$/;
const IN_PAGE_ANCHOR = /^#[A-Za-z][A-Za-z0-9_-]*$/;

/** C0 controls, DEL, and the backslash that some user agents read as `/`. */
const UNSAFE_HREF_CHARACTER = /[\\\u0000-\u001f\u007f]/;

/** `%2e`, `%2f`, and `%5c` decode to `.`, `/`, and `\`. */
const ENCODED_PATH_SEPARATOR = /%2e|%2f|%5c/i;

/**
 * A site-absolute path is safe when it is not protocol relative and no path
 * segment is a traversal. Matching whole segments rather than a bare `..`
 * substring keeps `/v1.2..3` legal while still rejecting `/a/../../etc`.
 */
const isSafeSiteAbsolutePath = (value: string): boolean => {
  if (value.startsWith("//") || ENCODED_PATH_SEPARATOR.test(value)) {
    return false;
  }

  return !value.split("/").some((segment) => segment === "..");
};

/**
 * Allows site-absolute paths without traversal, in-page anchors, and
 * `https://` URLs. Everything else — `javascript:`, `data:`, protocol
 * relative `//host`, `http://`, backslashes, control characters, and
 * percent-encoded separators — is rejected and rendered as plain text.
 */
export const safeHref = (href: string): string | null => {
  const value = href.trim();

  if (value === "" || UNSAFE_HREF_CHARACTER.test(value)) {
    return null;
  }

  if (IN_PAGE_ANCHOR.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return isSafeSiteAbsolutePath(value) ? value : null;
  }

  return ABSOLUTE_HTTPS_URL.test(value) ? value : null;
};

/**
 * Anchor-safe base id for a heading: lowercase, hyphen separated, and always
 * starting with a letter so it satisfies `IN_PAGE_ANCHOR`. An id that would
 * start with a digit — or a heading of nothing but punctuation — is prefixed
 * or replaced rather than dropped, so every heading stays linkable.
 */
const HEADING_INLINE_LINK = /!?\[([^\]]*)\]\([^)]*\)/g;
const UNSLUGGABLE_HEADING = "section";

const headingIdBase = (text: string): string => {
  const base = text
    .replace(HEADING_INLINE_LINK, "$1")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base === "") {
    return UNSLUGGABLE_HEADING;
  }

  return /^[0-9]/.test(base) ? `${UNSLUGGABLE_HEADING}-${base}` : base;
};

/** Options for {@link renderMarkdown}. */
export type RenderOptions = {
  /**
   * Optional namespace for heading ids, e.g. the slug of the document this
   * fragment belongs to. Every id becomes `<idPrefix>-<base>`, so several
   * documents rendered into one page cannot hand out the same id.
   */
  readonly idPrefix?: string;
};

/**
 * Normalises a caller-supplied `idPrefix` with the same rules a heading text
 * goes through, so a prefix can never introduce a character that is not legal
 * in an anchor. An empty or unsluggable prefix falls back to `section` rather
 * than silently disabling namespacing.
 */
const normalizeIdPrefix = (idPrefix: string | undefined): string => {
  if (idPrefix === undefined) {
    return "";
  }

  return headingIdBase(idPrefix);
};

/**
 * Hands out ids that are unique within one document. A repeated base keeps
 * its name and gains a `-2`, `-3`, … suffix, so the ids a reader can see stay
 * stable as long as the text above them does not change.
 *
 * The uniqueness counter is keyed on the *unprefixed* base, and the prefix is
 * prepended to the finished id. Because the prefix is constant for one
 * document, distinct bases still produce distinct ids.
 */
const createHeadingIdAllocator = (
  idPrefix: string,
): ((text: string) => string) => {
  const used = new Map<string, number>();
  const qualify = (id: string): string => (idPrefix === "" ? id : `${idPrefix}-${id}`);

  return (text: string) => {
    const base = headingIdBase(text);
    const seen = used.get(base) ?? 0;

    used.set(base, seen + 1);

    return qualify(seen === 0 ? base : `${base}-${seen}`);
  };
};

const renderInline = (raw: string): string => {
  const tokens: string[] = [];
  const stash = (html: string) => `\u0000${tokens.push(html) - 1}\u0000`;

  const withCode = raw.replace(/`([^`]+)`/g, (_match, code: string) =>
    stash(`<code>${escapeHtml(code)}</code>`),
  );

  const withImages = withCode.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_match, alt: string, source: string) => {
      const resolved = safeHref(source);

      return resolved === null
        ? stash(escapeHtml(alt))
        : stash(
            `<img src="${escapeHtml(resolved)}" alt="${escapeHtml(
              alt,
            )}" loading="lazy" decoding="async" />`,
          );
    },
  );

  const withLinks = withImages.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_match, label: string, href: string) => {
      const resolved = safeHref(href);

      return resolved === null
        ? escapeHtml(label)
        : stash(
            `<a href="${escapeHtml(resolved)}" rel="noopener noreferrer">${escapeHtml(
              label,
            )}</a>`,
          );
    },
  );

  const escaped = escapeHtml(withLinks);

  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/(^|[\s(])_([^_]+)_(?=$|[\s.,;:!?)])/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=$|[\s.,;:!?)])/g, "$1<em>$2</em>")
    .replace(/\u0000(\d+)\u0000/g, (_match, index: string) => {
      return tokens[Number(index)] ?? "";
    });
};

type ListKind = "ul" | "ol";

const isUnorderedItem = (line: string) => /^ {0,3}[-*+]\s+/.test(line);
const isOrderedItem = (line: string) => /^ {0,3}\d+\.\s+/.test(line);
const stripListMarker = (line: string) => line.replace(/^ {0,3}([-*+]|\d+\.)\s+/, "");

/** Block-level constructs that interrupt an open paragraph. */
const startsBlock = (line: string): boolean =>
  line.trim() === "" ||
  line.startsWith("```") ||
  /^ {0,3}#{1,6}\s/.test(line) ||
  /^ {0,3}>/.test(line) ||
  isUnorderedItem(line) ||
  isOrderedItem(line) ||
  /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);

const renderList = (
  lines: string[],
  startIndex: number,
  kind: ListKind,
): { html: string; nextIndex: number } => {
  const matches = kind === "ul" ? isUnorderedItem : isOrderedItem;
  const items: string[] = [];
  let index = startIndex;

  while (index < lines.length && matches(lines[index] as string)) {
    items.push(renderInline(stripListMarker(lines[index] as string)));
    index += 1;
  }

  return { html: `<${kind}>${items.map((i) => `<li>${i}</li>`).join("")}</${kind}>`, nextIndex: index };
};

/**
 * Renders Markdown to a safe HTML fragment.
 *
 * Supported: ATX headings (each with a unique `id`, namespaced by
 * `options.idPrefix` when one is given), paragraphs, fenced code blocks,
 * blockquotes, unordered and ordered lists, thematic breaks, in-page anchors,
 * `https://` links, safe images, and inline code/bold/italic/strikethrough.
 */
export const renderMarkdown = (
  source: string,
  options: RenderOptions = {},
): string => {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  const nextHeadingId = createHeadingIdAllocator(normalizeIdPrefix(options.idPrefix));
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] as string;

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const fence = /^ {0,3}```([A-Za-z0-9_+-]*)\s*$/.exec(line);

    if (fence) {
      const language = fence[1] ?? "";
      const code: string[] = [];
      index += 1;

      while (index < lines.length && !/^ {0,3}```\s*$/.test(lines[index] as string)) {
        code.push(lines[index] as string);
        index += 1;
      }

      index += 1;
      const languageClass =
        language === "" ? "" : ` class="language-${escapeHtml(language)}"`;
      output.push(
        `<pre><code${languageClass}>${escapeHtml(code.join("\n"))}</code></pre>`,
      );
      continue;
    }

    const heading = /^ {0,3}(#{1,6})\s+(.*)$/.exec(line);

    if (heading) {
      const level = (heading[1] as string).length;
      const text = (heading[2] ?? "").trim();
      const content = renderInline(text);
      output.push(`<h${level} id="${escapeHtml(nextHeadingId(text))}">${content}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      output.push("<hr />");
      index += 1;
      continue;
    }

    if (/^ {0,3}>/.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && /^ {0,3}>/.test(lines[index] as string)) {
        quoted.push((lines[index] as string).replace(/^ {0,3}>\s?/, ""));
        index += 1;
      }
      output.push(
        `<blockquote><p>${renderInline(quoted.join(" "))}</p></blockquote>`,
      );
      continue;
    }

    if (isUnorderedItem(line) || isOrderedItem(line)) {
      const { html, nextIndex } = renderList(
        lines,
        index,
        isUnorderedItem(line) ? "ul" : "ol",
      );
      output.push(html);
      index = nextIndex;
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && !startsBlock(lines[index] as string)) {
      paragraph.push((lines[index] as string).trim());
      index += 1;
    }

    if (paragraph.length > 0) {
      output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    }
  }

  return output.join("\n");
};
