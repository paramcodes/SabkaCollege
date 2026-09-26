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

const ABSOLUTE_HTTPS_URL = /^https:\/\/[^\s<>"']+$/;
const IN_PAGE_ANCHOR = /^#[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Allows site-absolute paths without traversal, in-page anchors, and
 * `https://` URLs. Everything else — `javascript:`, `data:`, protocol
 * relative `//host`, `http://`, and relative paths containing `..` — is
 * rejected and rendered as plain text.
 */
export const safeHref = (href: string): string | null => {
  const value = href.trim();

  if (IN_PAGE_ANCHOR.test(value)) {
    return value;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value.includes("..") ? null : value;
  }

  return ABSOLUTE_HTTPS_URL.test(value) ? value : null;
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
 * Supported: ATX headings, paragraphs, fenced code blocks, blockquotes,
 * unordered and ordered lists, thematic breaks, in-page anchors, `https://`
 * links, safe images, and inline code/bold/italic/strikethrough.
 */
export const renderMarkdown = (source: string): string => {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
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
      const content = renderInline((heading[2] ?? "").trim());
      output.push(`<h${level}>${content}</h${level}>`);
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
