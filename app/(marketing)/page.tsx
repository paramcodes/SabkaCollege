import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Compass,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { HeroMotion } from "@/src/components/motion/hero-motion";
import { Reveal } from "@/src/components/motion/reveal";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { landingContent } from "@/src/lib/content/landing";
import { formatCoursePrice } from "@/src/lib/formatting/currency";

export const metadata: Metadata = {
  title: "SabkaCollege — Learn with purpose",
  description:
    "Practical, self-paced courses for clear thinking, useful skills, and work you are proud to put your name to.",
};

type FeaturedCourse = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  priceAmount: number;
  currency: string;
  estimatedDurationMinutes: number;
};

type CatalogueResult =
  | { status: "courses"; courses: FeaturedCourse[] }
  | { status: "development-fallback" }
  | { status: "unavailable"; message: string };

async function getFeaturedCourses(): Promise<CatalogueResult> {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "development") {
      return { status: "development-fallback" };
    }

    return {
      status: "unavailable",
      message: "The course catalogue is being prepared. Please check back soon.",
    };
  }

  await connection();

  try {
    const { getFeaturedCourses: getFeaturedCoursesFromDatabase } =
      await import("@/src/db/queries/courses");
    const courses = await getFeaturedCoursesFromDatabase();

    return { status: "courses", courses };
  } catch (error) {
    console.error("Unable to load featured courses", error);

    return {
      status: "unavailable",
      message: "The course catalogue is temporarily unavailable. Please try again soon.",
    };
  }
}

function SectionHeading({
  eyebrow,
  title,
  description,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  inverse?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2
        className={`mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl ${
          inverse ? "text-background" : "text-foreground"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 ${
          inverse ? "text-background/65" : "text-muted-foreground"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function FeaturedCourses({ result }: { result: CatalogueResult }) {
  if (result.status === "unavailable") {
    return (
      <Reveal>
        <div className="mt-12 border-y border-foreground/20 py-12 text-center">
          <BookOpen className="mx-auto size-7 text-primary" aria-hidden="true" />
          <p className="mt-4 text-lg font-medium">{result.message}</p>
          <Button asChild variant="link" className="mt-3 h-auto p-0">
            <Link href="/pricing">Read our purchasing policy</Link>
          </Button>
        </div>
      </Reveal>
    );
  }

  if (result.status === "development-fallback") {
    return (
      <>
        <div className="mt-8 flex items-center gap-3 text-xs font-medium tracking-wide text-muted-foreground">
          <span className="h-px w-8 bg-primary" />
          Development preview · deterministic sample catalogue
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {landingContent.developmentCourses.map((course, index) => (
            <Reveal key={course.slug} delay={index * 0.08}>
              <Card className="h-full gap-0 rounded-none border-x-0 border-t-0 bg-transparent py-0 shadow-none ring-0">
                <div className="h-1 w-full bg-primary" />
                <CardHeader className="px-0 pt-7 pb-5 sm:px-7">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <Badge variant="outline">{course.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {course.duration}
                    </span>
                  </div>
                  <h3 className="font-serif text-3xl leading-tight tracking-[-0.025em]">
                    {course.title}
                  </h3>
                </CardHeader>
                <CardContent className="px-0 sm:px-7">
                  <p className="min-h-20 leading-7 text-muted-foreground">
                    {course.description}
                  </p>
                  <div className="mt-8 flex items-end justify-between border-t border-border pt-5">
                    <div>
                      <p className="text-xs tracking-wide text-muted-foreground uppercase">
                        One-time
                      </p>
                      <p className="mt-1 font-serif text-2xl">{course.price}</p>
                    </div>
                    <Button asChild variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
                      <Link
                        href={`/courses/${course.slug}`}
                        aria-label={`View ${course.title} course`}
                      >
                        View course <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </>
    );
  }

  if (result.courses.length === 0) {
    return (
      <Reveal>
        <div className="mt-12 border-y border-foreground/20 py-12 text-center">
          <BookOpen className="mx-auto size-7 text-primary" aria-hidden="true" />
          <p className="mt-4 text-lg font-medium">No published courses yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            New courses will appear here as the editorial team publishes them.
          </p>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {result.courses.map((course, index) => (
        <Reveal key={course.slug} delay={index * 0.08}>
          <Card className="h-full rounded-none bg-card shadow-none ring-1 ring-foreground/15 transition-shadow hover:shadow-[0_16px_50px_rgba(45,37,25,0.08)]">
            <CardHeader className="px-6 pt-7">
              <div className="mb-8 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {course.estimatedDurationMinutes > 0
                    ? `${Math.max(1, Math.round(course.estimatedDurationMinutes / 60))} hours`
                    : "Self-paced"}
                </span>
                <span>Course {String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="font-serif text-2xl leading-tight tracking-[-0.025em]">
                {course.title}
              </h3>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col px-6">
              <p className="line-clamp-4 leading-7 text-muted-foreground">
                {course.shortDescription ?? course.description}
              </p>
              <div className="mt-auto flex items-end justify-between border-t border-border pt-5">
                <p className="font-serif text-xl">
                  {formatCoursePrice(course.priceAmount, course.currency)}
                </p>
                <Button asChild variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
                  <Link
                    href={`/courses/${course.slug}`}
                    aria-label={`View ${course.title} course`}
                  >
                    View <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}

async function FeaturedCoursesSection() {
  const result = await getFeaturedCourses();

  return <FeaturedCourses result={result} />;
}

export default async function LandingPage() {
  return (
    <>
      <section className="relative border-b border-foreground/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_36%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:py-32">
          <HeroMotion>
            <div className="max-w-3xl">
              <p
                data-hero-item
                className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-primary uppercase"
              >
                <span className="h-px w-9 bg-primary" />
                {landingContent.hero.eyebrow}
              </p>
              <h1
                data-hero-item
                className="mt-7 font-serif text-6xl leading-[0.94] tracking-[-0.055em] text-balance sm:text-7xl lg:text-[6.4rem]"
              >
                {landingContent.hero.title}
              </h1>
              <p
                data-hero-item
                className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9"
              >
                {landingContent.hero.description}
              </p>
              <div data-hero-item className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-5">
                  <Link href="/courses">
                    {landingContent.hero.primaryAction}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-5">
                  <Link href="#how-it-works">{landingContent.hero.secondaryAction}</Link>
                </Button>
              </div>
            </div>
          </HeroMotion>

          <Reveal delay={0.12} className="lg:pl-6">
            <div className="relative mx-auto w-full max-w-lg border border-foreground/20 bg-card p-3 shadow-[10px_10px_0_var(--secondary)]">
              <div className="border border-foreground/15 bg-background">
                <div className="flex items-center justify-between border-b border-foreground/15 px-5 py-4">
                  <span className="text-[0.68rem] font-semibold tracking-[0.18em] uppercase">
                    Field notes / Lesson 04
                  </span>
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                </div>
                <div className="p-6 sm:p-8">
                  <p className="font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
                    Make the useful idea impossible to miss.
                  </p>
                  <div className="my-8 h-px bg-foreground/20" />
                  <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-4 text-sm">
                    <span className="font-mono text-xs text-primary">01</span>
                    <p className="border-b border-border pb-4 leading-6">Find the central question.</p>
                    <span className="font-mono text-xs text-primary">02</span>
                    <p className="border-b border-border pb-4 leading-6">Choose the clearest sequence.</p>
                    <span className="font-mono text-xs text-primary">03</span>
                    <p className="leading-6">Make the next step easy to see.</p>
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-foreground/15 pt-5">
                    <span className="text-xs text-muted-foreground">18 min lesson</span>
                    <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <Reveal>
          <SectionHeading {...landingContent.outcomes} />
        </Reveal>
        <div className="mt-14 grid border-t border-foreground/20 md:grid-cols-3">
          {landingContent.outcomes.items.map((item, index) => (
            <Reveal key={item.number} delay={index * 0.08}>
              <article className="border-b border-foreground/20 py-8 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                <span className="font-mono text-xs text-primary">{item.number}</span>
                <h3 className="mt-10 font-serif text-2xl tracking-[-0.02em]">
                  {item.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-foreground/15 bg-secondary/55">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <Reveal className="max-w-3xl">
              <SectionHeading {...landingContent.featuredCourses} />
            </Reveal>
            <Reveal delay={0.08}>
              <Button asChild variant="outline" size="lg" className="h-12 px-5">
                <Link href="/courses">
                  Browse all courses <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </Reveal>
          </div>
          <Suspense
            fallback={
              <div className="mt-12 border-y border-foreground/20 py-12 text-center text-sm text-muted-foreground">
                Loading the current shelf...
              </div>
            }
          >
            <FeaturedCoursesSection />
          </Suspense>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <Reveal>
          <SectionHeading {...landingContent.howItWorks} />
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden border border-foreground/20 bg-foreground/20 sm:grid-cols-2">
          {landingContent.howItWorks.items.map((item, index) => (
            <Reveal key={item.number} delay={(index % 2) * 0.08}>
              <article className="h-full bg-background p-7 sm:p-9">
                <div className="flex items-center gap-4">
                  <span className="grid size-10 place-items-center rounded-full border border-primary/40 font-mono text-xs text-primary">
                    {item.number}
                  </span>
                  <h3 className="font-serif text-2xl tracking-[-0.02em]">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="preview" className="bg-foreground text-background">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:py-32">
          <Reveal>
            <SectionHeading {...landingContent.preview} inverse />
            <ul className="mt-9 space-y-4">
              {landingContent.preview.points.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-6 text-background/75">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-9 h-12 px-5">
              <Link href="/courses">
                Preview a course <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="border border-background/20 bg-background/5 p-5 sm:p-8">
              <div className="aspect-video border border-background/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_45%,transparent),transparent)] p-6 sm:p-10">
                <div className="flex h-full flex-col justify-between border border-dashed border-background/25 p-5 sm:p-7">
                  <div className="flex items-center justify-between text-xs tracking-[0.16em] text-background/50 uppercase">
                    <span>Course preview</span>
                    <span>12:48</span>
                  </div>
                  <div className="mx-auto grid size-16 place-items-center rounded-full bg-background text-foreground shadow-xl transition-transform hover:scale-105">
                    <Play className="ml-1 size-5 fill-current" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="mb-3 h-1 overflow-hidden rounded-full bg-background/20">
                      <div className="h-full w-[38%] rounded-full bg-primary" />
                    </div>
                    <div className="flex justify-between text-xs text-background/45">
                      <span>Lesson preview</span>
                      <span>38% watched</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <SectionHeading {...landingContent.credibility} />
          </Reveal>
          <div className="space-y-px bg-foreground/15">
            {landingContent.credibility.principles.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 0.07}>
                <article className="grid gap-4 bg-background py-7 sm:grid-cols-[3rem_1fr] sm:py-8">
                  <Compass className="size-6 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-serif text-2xl tracking-[-0.02em]">
                      {principle.title}
                    </h3>
                    <p className="mt-3 leading-7 text-muted-foreground">
                      {principle.description}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-foreground/15 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-4xl">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-70">
                  {landingContent.finalCta.eyebrow}
                </p>
                <h2 className="mt-5 font-serif text-5xl leading-[0.98] tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
                  {landingContent.finalCta.title}
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 opacity-75">
                  {landingContent.finalCta.description}
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="h-13 bg-background px-6 text-foreground hover:bg-background/90"
              >
                <Link href="/courses">
                  Explore courses <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
