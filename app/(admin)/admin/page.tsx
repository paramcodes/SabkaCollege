import Link from "next/link";
import { ArrowRight, BookOpen, CreditCard, Users } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { getAdminOverview } from "@/src/db/queries/admin";

export const instant = false;

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();
  const cards = [
    { label: "Published courses", value: overview.courses.published ?? 0, icon: BookOpen },
    { label: "Draft courses", value: overview.courses.draft ?? 0, icon: BookOpen },
    { label: "Students", value: overview.students, icon: Users },
    { label: "Purchases", value: overview.purchases, icon: CreditCard },
  ];

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Content operations</p>
          <h1 className="mt-2 font-serif text-4xl">Admin overview</h1>
          <p className="mt-2 text-muted-foreground">Manage course content, students, and purchase records.</p>
        </div>
        <Button asChild>
          <Link href="/admin/courses/new">New course <ArrowRight aria-hidden="true" /></Link>
        </Button>
      </header>
      <section aria-label="Admin metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-3xl font-semibold">{value}</p></CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <CardHeader><CardTitle>Publishing safety</CardTitle></CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Draft and archived courses are excluded from the public catalogue. Publishing is always an explicit status change.
        </CardContent>
      </Card>
    </div>
  );
}
