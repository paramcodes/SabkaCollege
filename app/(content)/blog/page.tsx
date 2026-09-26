import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { getBlogPosts } from "@/src/lib/content/blog";

export const metadata: Metadata = {
  title: "Blog — SabkaCollege",
  description:
    "Notes from SabkaCollege on learning, course design, and how the platform works.",
};

/** `YYYY-MM-DD` is validated at build time, so this is always parseable. */
const formatDate = (value: string): string =>
  new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">From the editorial team</p>
        <h1 className="mt-3 font-serif text-5xl tracking-[-0.03em] sm:text-6xl">
          Notes on learning
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          How we build courses, how the learning experience fits together, and
          what we have learned about teaching on the open web.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-12 border border-dashed border-foreground/20 p-8 text-center text-muted-foreground">
          No articles have been published yet. Check back soon.
        </p>
      ) : (
        <ol className="mt-14 grid gap-8">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="border border-foreground/15 p-6 transition-colors hover:border-primary/60 sm:p-8">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock aria-hidden="true" className="size-3.5" />
                    {post.readingTime}
                  </span>
                </div>

                <h2 className="mt-4 font-serif text-3xl tracking-[-0.025em]">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {post.title}
                  </Link>
                </h2>

                <p className="mt-3 leading-7 text-foreground/80">{post.description}</p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Badge variant="secondary">{tag}</Badge>
                    </li>
                  ))}
                </ul>

                <Button asChild variant="ghost" className="mt-6 w-fit px-0 hover:bg-transparent hover:text-primary">
                  <Link href={`/blog/${post.slug}`}>
                    Read the article <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </article>
            </li>
          ))}
        </ol>
      )}

      <aside className="mt-16 border border-foreground/15 p-6 sm:p-8">
        <BookOpen aria-hidden="true" className="size-6 text-primary" />
        <h2 className="mt-4 font-serif text-2xl">Building or maintaining SabkaCollege?</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          The teammate guides cover the route map, the data model, the
          authentication and billing rules, and the exact steps for publishing a
          course.
        </p>
        <Button asChild className="mt-6 w-fit">
          <Link href="/docs">
            Open the guides <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </aside>
    </div>
  );
}
