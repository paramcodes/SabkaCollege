import { describe, expect, it } from "vitest";

import { escapeHtml, renderMarkdown, safeHref } from "../../../src/lib/content/markdown";

/** The `id` attribute of every heading in a rendered fragment, in order. */
const headingIds = (html: string): string[] =>
  [...html.matchAll(/<h[1-6] id="([^"]*)">/g)].map((match) => match[1] as string);

describe("escapeHtml", () => {
  it("escapes every character that can break out of text or an attribute", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes ampersands before the entities it introduces", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Plain text 123 — ok")).toBe("Plain text 123 — ok");
  });
});

describe("safeHref", () => {
  it("accepts in-page anchors that start with a letter", () => {
    expect(safeHref("#top")).toBe("#top");
    expect(safeHref("#page-map")).toBe("#page-map");
    expect(safeHref("#a-b_c1")).toBe("#a-b_c1");
  });

  it("rejects anchors that do not match the generated heading ids", () => {
    expect(safeHref("#1bad")).toBeNull();
    expect(safeHref("#-leading")).toBeNull();
    expect(safeHref("#with space")).toBeNull();
    expect(safeHref("#")).toBeNull();
  });

  it("accepts site-absolute paths without a traversal segment", () => {
    expect(safeHref("/courses")).toBe("/courses");
    expect(safeHref("/guides/components.md")).toBe("/guides/components.md");
    expect(safeHref("/courses?next=https://example.com")).toBe(
      "/courses?next=https://example.com",
    );
  });

  it("keeps a bare `..` inside a segment legal", () => {
    expect(safeHref("/v1.2..3")).toBe("/v1.2..3");
  });

  it("trims surrounding whitespace before deciding", () => {
    expect(safeHref("  /courses  ")).toBe("/courses");
    expect(safeHref("   ")).toBeNull();
  });

  it("accepts https URLs", () => {
    expect(safeHref("https://example.com/guide")).toBe("https://example.com/guide");
  });

  it("rejects a non-https scheme or a differently cased one", () => {
    expect(safeHref("http://example.com")).toBeNull();
    expect(safeHref("HTTPS://example.com")).toBeNull();
  });

  it("rejects javascript: and data: URLs whatever their casing", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeHref("java\tscript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<b>")).toBeNull();
    expect(safeHref("javascript&#58;alert(1)")).toBeNull();
  });

  it("rejects a traversal or a protocol-relative path", () => {
    expect(safeHref("/a/../b")).toBeNull();
    expect(safeHref("/a/../../etc")).toBeNull();
    expect(safeHref("//evil.example.com")).toBeNull();
  });

  it("rejects percent-encoded separators that decode to a traversal", () => {
    expect(safeHref("/a%2e%2e/b")).toBeNull();
    expect(safeHref("/a%2Fb")).toBeNull();
    expect(safeHref("/a%5Cb")).toBeNull();
  });

  it("rejects backslashes, which some user agents read as a separator", () => {
    expect(safeHref("/a\\b")).toBeNull();
    expect(safeHref("https://example.com/a\\b")).toBeNull();
    expect(safeHref("\\\\evil.example.com")).toBeNull();
  });

  it("rejects C0 control characters and DEL", () => {
    expect(safeHref("/courses\u0000")).toBeNull();
    expect(safeHref("/courses\u0007")).toBeNull();
    expect(safeHref("/courses\u001f")).toBeNull();
    expect(safeHref("/courses\u007f")).toBeNull();
    expect(safeHref("https://exa\u0000mple.com/")).toBeNull();
    expect(safeHref("https://example.com/a\u001fb")).toBeNull();
  });

  it("rejects a URL carrying raw markup characters", () => {
    expect(safeHref("https://example.com/<script>")).toBeNull();
    expect(safeHref('https://example.com/"onmouseover="x')).toBeNull();
  });

  it("rejects an empty or relative destination", () => {
    expect(safeHref("")).toBeNull();
    expect(safeHref("guide.md")).toBeNull();
    expect(safeHref("../guide.md")).toBeNull();
  });
});

describe("renderMarkdown heading ids", () => {
  it("slugs a heading into an anchor-safe id", () => {
    expect(renderMarkdown("## Getting started\n")).toContain(
      '<h2 id="getting-started">Getting started</h2>',
    );
  });

  it("collapses punctuation and repeated separators", () => {
    expect(headingIds(renderMarkdown("## Auth & billing!!! (2026)\n"))).toEqual([
      "auth-billing-2026",
    ]);
  });

  it("prefixes an id that would otherwise start with a digit", () => {
    expect(headingIds(renderMarkdown("# 1. Intro\n"))).toEqual(["section-1-intro"]);
  });

  it("replaces an id that cannot be slugged at all", () => {
    expect(headingIds(renderMarkdown("# !!!\n"))).toEqual(["section"]);
  });

  it("slugifies from the heading text, not from the rendered inline HTML", () => {
    expect(headingIds(renderMarkdown("# See the [page map](page-map.md) guide\n"))).toEqual([
      "see-the-page-map-guide",
    ]);
  });

  it("suffixes repeats so every heading in a document is linkable", () => {
    const html = renderMarkdown("# Notes\n\n# Notes\n\n# Notes\n");

    expect(headingIds(html)).toEqual(["notes", "notes-1", "notes-2"]);
  });

  it("numbers each level independently of the others", () => {
    expect(headingIds(renderMarkdown("# Notes\n\n## Notes\n"))).toEqual([
      "notes",
      "notes-1",
    ]);
  });

  it("restarts the numbering for a new document", () => {
    expect(headingIds(renderMarkdown("# Notes\n"))).toEqual(["notes"]);
    expect(headingIds(renderMarkdown("# Notes\n"))).toEqual(["notes"]);
  });

  it("emits an id that safeHref accepts, so cross-links resolve", () => {
    for (const id of headingIds(renderMarkdown("# 1. Intro\n\n# !!!\n"))) {
      expect(safeHref(`#${id}`)).toBe(`#${id}`);
    }
  });
});

describe("renderMarkdown inline output", () => {
  it("escapes raw HTML in the source into visible text", () => {
    expect(renderMarkdown("Text <img src=x onerror=alert(1)> here\n")).toBe(
      "<p>Text &lt;img src=x onerror=alert(1)&gt; here</p>",
    );
    expect(renderMarkdown("<script>alert(1)</script>\n")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("renders a safe link with a hardened rel", () => {
    expect(renderMarkdown("[Page map](#page-map)\n")).toBe(
      '<p><a href="#page-map" rel="noopener noreferrer">Page map</a></p>',
    );
  });

  it("renders an https link and escapes ampersands in its query", () => {
    expect(renderMarkdown("[Docs](https://example.com/?a=1&b=2)\n")).toBe(
      '<p><a href="https://example.com/?a=1&amp;b=2" rel="noopener noreferrer">Docs</a></p>',
    );
  });

  it("escapes the label rather than emitting a link for a rejected destination", () => {
    expect(renderMarkdown("[Bad](javascript:alert(1))\n")).not.toContain("<a ");
    expect(renderMarkdown("[Bad](javascript:alert(1))\n")).toContain("Bad");
    expect(renderMarkdown("[Bad](http://example.com)\n")).not.toContain("<a ");
    expect(renderMarkdown("[Bad](/a/../b)\n")).not.toContain("<a ");
  });

  it("escapes quote characters in a label and an alt text", () => {
    expect(renderMarkdown('[a "quoted" label](/a)\n')).toContain("&quot;quoted&quot;");
    expect(renderMarkdown('![a "quoted" alt](/i.png)\n')).toContain('alt="a &quot;quoted&quot; alt"');
  });

  it("renders an image with lazy loading and escaped attributes", () => {
    expect(renderMarkdown("![Diagram](/i.png)\n")).toBe(
      '<p><img src="/i.png" alt="Diagram" loading="lazy" decoding="async" /></p>',
    );
  });

  it("degrades a rejected image to its alt text with no img tag", () => {
    const html = renderMarkdown("![Logo](javascript:alert(1))\n");

    expect(html).not.toContain("<img");
    expect(html).toContain("Logo");
  });

  it("escapes code spans and fenced blocks instead of honouring markup in them", () => {
    expect(renderMarkdown("Use `a < b` here\n")).toContain("<code>a &lt; b</code>");
    expect(renderMarkdown("```ts\nlet a = 1 < 2;\n```\n")).toBe(
      '<pre><code class="language-ts">let a = 1 &lt; 2;</code></pre>',
    );
  });

  it("keeps emphasis, lists, quotes, and rules working", () => {
    expect(renderMarkdown("**b** _i_ ~~d~~\n")).toBe(
      "<p><strong>b</strong> <em>i</em> <del>d</del></p>",
    );
    expect(renderMarkdown("- one\n- two\n")).toBe("<ul><li>one</li><li>two</li></ul>");
    expect(renderMarkdown("1. a\n1. b\n")).toBe("<ol><li>a</li><li>b</li></ol>");
    expect(renderMarkdown("> quoted\n")).toBe("<blockquote><p>quoted</p></blockquote>");
    expect(renderMarkdown("---\n")).toBe("<hr />");
  });
});
