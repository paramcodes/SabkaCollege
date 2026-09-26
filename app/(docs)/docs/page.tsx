import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FileText } from "lucide-react";

import { Prose } from "@/src/components/content/prose";
import { Badge } from "@/src/components/ui/badge";
import { getGuidesWithContent, type Guide } from "@/src/lib/content/docs";

/**
 * Every guide lives on this one page under a `#slug` anchor, so this list
 * fixes the reading order instead of relying on file names or publication
 * dates. A guide that is not listed here still renders — it is appended after
 * the known ones in slug order, so adding a file never silently drops it.
 */
const READING_ORDER = [
  "getting-started",
  "architecture",
  "page-map",
  "database",
  "authentication-and-billing",
  "adding-a-course",
  "components",
  "deployment",
  "troubleshooting",
] as const;

const readingRank = (slug: string): number => {
  const index = READING_ORDER.indexOf(
    slug as (typeof READING_ORDER)[number],
  );

  return index === -1 ? READING_ORDER.length : index;
};

const inReadingOrder = (guides: Guide[]): Guide[] =>
  [...guides].sort(
    (left, right) =>
      readingRank(left.frontmatter.slug) - readingRank(right.frontmatter.slug) ||
      left.frontmatter.slug.localeCompare(right.frontmatter.slug, "en"),
  );

export const metadata: Metadata = {
  title: "Teammate guides — SabkaCollege",
  description:
    "Handbooks for building, running, and maintaining SabkaCollege: the route map, the data model, authentication and billing, and publishing a course.",
};

/**
 * There is no `generateStaticParams` here, and that is deliberate: the route
 * has no dynamic segment, so there is no parameter to enumerate. Every guide
 * is read from `docs/guides` at build time and rendered into this single
 * statically generated page. A future `/docs/[slug]` route would need one.
 *
 * `getGuidesWithContent` throws `ContentValidationError` when frontmatter is
 * invalid or two guides share a slug, so a broken file fails the build instead
 * of rendering a half-empty page.
 *
 * Anchor contract: each guide owns an unprefixed `id` equal to its slug, so
 * `#database` and the cross-guide links inside the Markdown keep working.
 * Every heading *inside* a guide is rendered with the guide slug as an
 * `idPrefix`, because all nine guides share this one document and unprefixed
 * heading ids would otherwise repeat across them.
 */
export default async function DocsPage() {
  const guides = inReadingOrder(await getGuidesWithContent());

  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Handbook</p>
        <h1 className="mt-3 font-serif text-5xl tracking-[-0.03em] sm:text-6xl">
          Teammate guides
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          How SabkaCollege is put together and how to change it safely. Every
          guide is a Markdown file in{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">
            docs/guides
          </code>
          , validated at build time. Read a guide end to end before you edit
          the files it names.
        </p>
      </header>

      <nav
        aria-label="Guides in this handbook"
        className="mt-12 border border-foreground/15"
      >
        <h2 className="border-b border-foreground/15 px-6 py-4 font-serif text-xl">
          <span className="inline-flex items-center gap-2">
            <FileText aria-hidden="true" className="size-4 text-primary" />
            In this handbook
          </span>
        </h2>

        <ol className="divide-y divide-foreground/10">
          {guides.map((guide, index) => (
            <li key={guide.frontmatter.slug}>
              <a
                href={guide.anchor}
                className="flex flex-col gap-2 px-6 py-5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
              >
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs tabular-nums text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-xl tracking-[-0.02em]">
                    {guide.frontmatter.title}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock aria-hidden="true" className="size-3.5" />
                    {guide.frontmatter.readingTime}
                  </span>
                </span>
                <span className="text-sm leading-6 text-muted-foreground">
                  {guide.frontmatter.description}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {guides.length === 0 ? (
        <p className="mt-12 border border-dashed border-foreground/20 p-8 text-center text-muted-foreground">
          No guides are in <code className="font-mono">docs/guides</code> yet.
        </p>
      ) : (
        <div className="mt-16">
          {guides.map((guide) => (
            <article
              key={guide.frontmatter.slug}
              id={guide.frontmatter.slug}
              className="scroll-mt-24 border-t border-foreground/15 pt-12 first:border-t-0 first:pt-0"
            >
              <header>
                {/* Guides are authored starting at `##`, so the body sections
                    and this title share a level. Each guide is its own
                    `article`, which is what keeps the sections scoped. */}
                <h2 className="font-serif text-3xl tracking-[-0.025em]">
                  {guide.frontmatter.title}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <ul className="flex flex-wrap gap-2">
                    {guide.frontmatter.tags.map((tag) => (
                      <li key={tag}>
                        <Badge variant="secondary">{tag}</Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/80">
                    Source:{" "}
                    <code className="font-mono">{guide.sourcePath}</code>
                  </p>
                </div>
              </header>

              <div className="mt-6">
                <Prose
                  markdown={guide.body}
                  idPrefix={guide.frontmatter.slug}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="mt-16 border-t border-foreground/15 pt-8">
        <p className="text-sm text-muted-foreground">
          Looking for the product story instead of the internals?{" "}
          <Link
            href="/blog"
            className="font-medium text-primary hover:underline"
          >
            Read the blog
          </Link>{" "}
          or{" "}
          <Link
            href="/courses"
            className="font-medium text-primary hover:underline"
          >
            browse the catalogue
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
