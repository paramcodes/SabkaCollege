import Link from "next/link";

const currentYear = new Date().getFullYear();

const footerLinks = [
  {
    title: "Learn",
    links: [
      { href: "/courses", label: "Course catalogue" },
      { href: "/pricing", label: "Pricing" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/dashboard", label: "Student dashboard" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#preview", label: "Learning preview" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/15 bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10 lg:py-18">
        <div className="max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-background/40"
          >
            <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold tracking-[0.12em] text-primary-foreground">
              SC
            </span>
            <span className="text-base font-semibold">SabkaCollege</span>
          </Link>
          <p className="mt-5 text-sm leading-6 text-background/65">
            An editorial academy for practical skills, clear thinking, and learning
            that continues at your pace.
          </p>
        </div>

        {footerLinks.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold tracking-[0.18em] text-background/50 uppercase">
              {group.title}
            </h2>
            <ul className="mt-5 space-y-3">
              {group.links.map((link) => (
                <li key={`${group.title}-${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-sm text-background/75 transition-colors hover:text-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-background/40"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-background/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-background/50 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© {currentYear} SabkaCollege. Learn deliberately.</p>
          <p>Self-paced courses. One-time purchases.</p>
        </div>
      </div>
    </footer>
  );
}
