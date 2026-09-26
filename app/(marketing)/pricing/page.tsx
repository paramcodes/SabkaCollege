import type { Metadata } from "next";
import { ArrowRight, Check, CreditCard, Infinity, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/src/components/motion/reveal";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { pricingContent } from "@/src/lib/content/landing";

export const metadata: Metadata = {
  title: "Pricing — SabkaCollege",
  description:
    "Buy a SabkaCollege course once with no subscription. Review purchasing details and frequently asked questions.",
};

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-foreground/15">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:py-32">
          <Reveal>
            <div className="max-w-3xl">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                <span className="h-px w-9 bg-primary" />
                {pricingContent.eyebrow}
              </p>
              <h1 className="mt-7 font-serif text-6xl leading-[0.96] tracking-[-0.05em] text-balance sm:text-7xl lg:text-[5.7rem]">
                {pricingContent.title}
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
                {pricingContent.description}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-5">
                  <Link href="/courses">
                    Browse courses <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-5">
                  <Link href="#faq">Read the FAQ</Link>
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-md border border-foreground/20 bg-card p-7 shadow-[10px_10px_0_var(--secondary)] sm:p-9">
              <div className="flex items-start justify-between gap-6 border-b border-border pb-7">
                <div>
                  <Badge variant="secondary">Course purchase</Badge>
                  <p className="mt-4 font-serif text-3xl tracking-[-0.03em]">
                    One course. One payment.
                  </p>
                </div>
                <CreditCard className="size-7 shrink-0 text-primary" aria-hidden="true" />
              </div>
              <ul className="space-y-4 py-7">
                {pricingContent.included.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6">
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border pt-6 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Infinity className="size-5 text-primary" aria-hidden="true" />
                  No renewal
                </span>
                <span className="font-semibold">Course-specific pricing</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <Reveal className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Your purchase journey
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl">
            From first look to first lesson.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Checkout is deliberately simple. The public course page shows exactly
            what you are buying before an account is required.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden border border-foreground/20 bg-foreground/20 lg:grid-cols-3">
          {pricingContent.purchaseSteps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08}>
              <article className="h-full bg-background p-7 sm:p-9">
                <span className="font-mono text-xs text-primary">{step.number}</span>
                <h3 className="mt-8 font-serif text-2xl tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="border-y border-foreground/15 bg-secondary/55">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-10 lg:py-32">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                Questions, answered
              </p>
              <h2 className="mt-4 font-serif text-5xl leading-[1] tracking-[-0.04em]">
                Before you buy.
              </h2>
              <p className="mt-6 max-w-md leading-7 text-muted-foreground">
                Still unsure? Explore the course overview and speak with preview
                lessons before deciding.
              </p>
              <Button asChild variant="link" className="mt-5 h-auto p-0">
                <Link href="/courses">
                  Explore the catalogue <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="border-t border-foreground/20">
              {pricingContent.faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="group border-b border-foreground/20 py-1"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-6 font-serif text-xl tracking-[-0.015em] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-2xl">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="relative size-5 shrink-0 text-primary before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-current after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-current after:transition-transform group-open:after:scale-y-0"
                    />
                  </summary>
                  <p className="max-w-2xl pb-7 pr-10 leading-7 text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <Reveal>
            <div className="flex flex-col gap-9 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
                <h2 className="mt-5 font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
                  Know what you are buying. Then get started.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-background/65">
                  Course prices and purchase details are shown clearly on every
                  public course page.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="h-13 shrink-0 bg-background px-6 text-foreground hover:bg-background/90"
              >
                <Link href="/courses">
                  Find a course <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
