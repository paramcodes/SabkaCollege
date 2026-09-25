import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAdmin } from "@/src/lib/auth/guards";
import { CourseForm } from "@/src/components/admin/course-form";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export const instant = false;

export default async function NewCoursePage() {
  await requireAdmin();

  return (
    <div className="grid gap-8">
      <Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent hover:text-primary">
        <Link href="/admin/courses"><ArrowLeft aria-hidden="true" /> Back to courses</Link>
      </Button>
      <header>
        <p className="text-sm font-medium text-primary">Content library</p>
        <h1 className="mt-2 font-serif text-4xl">Create course</h1>
        <p className="mt-2 text-muted-foreground">Start with a draft. Publishing is an explicit action.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Course details</CardTitle></CardHeader>
        <CardContent><CourseForm /></CardContent>
      </Card>
    </div>
  );
}
