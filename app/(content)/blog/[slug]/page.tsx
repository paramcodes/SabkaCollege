import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";

import { Prose } from "@/src/components/content/prose";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { getBlogPost, getBlogPosts } from "@/src/lib/content/blog";

/**
 * Every published article is prerendered at build time. `dynamicParams` is not
 * available with Cache Components, so an unknown slug is handled in the page
 * body with `notFound()` instead.
 */
export async function generateStaticParams() {
  const posts = await getBlogPosts();

  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // An unknown slug resolves to `null` here too; the page turns that into a
  // 404, so metadata must never dereference a missing post.
  const post = await getBlogPost(slug);

  if (!post) {
    return { title: "Article not found — SabkaCollege" };
  }

  return {
    title: `${post.frontmatter.title} — SabkaCollege`,
    description: post.frontmatter.description,
  };
}

/** `YYYY-MM-DD` is validated at build time, so this is always parseable. */
const formatDate = (value: string): string =>
  new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // `getBlogPost` returns `null` for a malformed slug and for a slug that is
  // not in the index built from `docs/blog`. Both cases are a 404.
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const { frontmatter } = post;
  const posts = await getBlogPosts();
  const currentIndex = posts.findIndex((entry) => entry.slug === frontmatter.slug);
  const nextPost =
    currentIndex >= 0 ? (posts[currentIndex + 1] ?? null) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/blog" className="hover:text-foreground">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-64 truncate text-foreground">
            {frontmatter.title}
          </li>
        </ol>
      </nav>

      <article className="mt-10">
        <header>
          <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.035em] text-balance sm:text-5xl">
            {frontmatter.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {frontmatter.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-foreground/15 py-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              <time dateTime={frontmatter.publishedAt}>
                {formatDate(frontmatter.publishedAt)}
              </time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-3.5" />
              {frontmatter.readingTime}
            </span>
            <span className="text-muted-foreground/80">
              Source: <code className="font-mono">{post.sourcePath}</code>
            </span>
          </div>
        </header>

        <div className="mt-10">
          <Prose markdown={post.body} />
        </div>

        <ul className="mt-10 flex flex-wrap gap-2">
          {frontmatter.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary">{tag}</Badge>
            </li>
          ))}
        </ul>
      </article>

      <footer className="mt-14 flex flex-col gap-4 border-t border-foreground/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent hover:text-primary">
          <Link href="/blog">
            <ArrowLeft aria-hidden="true" /> All articles
          </Link>
        </Button>

        {nextPost ? (
          <Link
            href={`/blog/${nextPost.slug}`}
            className="font-medium transition-colors hover:text-primary"
          >
            Next: {nextPost.title}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            That is every article so far.{" "}
            <Link href="/docs" className="font-medium text-primary hover:underline">
              Read the teammate guides
            </Link>{" "}
            in the meantime.
          </p>
        )}
      </footer>
    </div>
  );
}
