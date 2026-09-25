import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CreditCard, LayoutDashboard, Users } from "lucide-react";

import { requireAdmin } from "@/src/lib/auth/guards";
import { Badge } from "@/src/components/ui/badge";

const adminReturnPath = "/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(adminReturnPath)}`);
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <BookOpen aria-hidden="true" className="size-5 text-primary" />
            SabkaCollege Admin
          </Link>
          <Badge variant="secondary">Administrator workspace</Badge>
        </div>
        <nav aria-label="Admin navigation" className="mx-auto max-w-7xl px-5 sm:px-8">
          <ul className="flex flex-wrap gap-2 pb-3">
            <li>
              <Link className="inline-flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted" href="/admin">
                <LayoutDashboard aria-hidden="true" className="size-4" /> Overview
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted" href="/admin/courses">
                <BookOpen aria-hidden="true" className="size-4" /> Courses
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted" href="/admin/students">
                <Users aria-hidden="true" className="size-4" /> Students
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted" href="/admin/purchases">
                <CreditCard aria-hidden="true" className="size-4" /> Purchases
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
