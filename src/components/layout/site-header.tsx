"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";

const navigation = [
  { href: "/courses", label: "Courses" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstMobileNavigationLinkRef = useRef<HTMLAnchorElement>(null);

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    firstMobileNavigationLinkRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setIsMenuOpen(false);
      toggleRef.current?.focus();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/15 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={closeMenu}
        >
          <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold tracking-[0.12em] text-primary-foreground transition-transform group-hover:-rotate-3">
            SC
          </span>
          <span className="text-base font-semibold tracking-[-0.02em]">
            Sabka<span className="text-primary">College</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        <Button
          ref={toggleRef}
          type="button"
          variant="outline"
          size="icon-lg"
          className="md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {isMenuOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-foreground/15 bg-background px-5 py-5 md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item, index) => (
              <Link
                key={item.href}
                ref={index === 0 ? firstMobileNavigationLinkRef : undefined}
                href={item.href}
                className="rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-5">
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-in" onClick={closeMenu}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/dashboard" onClick={closeMenu}>
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
