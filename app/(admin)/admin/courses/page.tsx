import Link from "next/link";

import { requireAdmin } from "@/src/lib/auth/guards";
import { getAdminCourses } from "@/src/db/queries/admin";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";

export const instant = false;

export default async function AdminCoursesPage() {
  await requireAdmin();
  const courses = await getAdminCourses();

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Content library</p>
          <h1 className="mt-2 font-serif text-4xl">Courses</h1>
          <p className="mt-2 text-muted-foreground">Create, edit, and publish course content.</p>
        </div>
        <Button asChild><Link href="/admin/courses/new">New course</Link></Button>
      </header>
      <Card>
        <CardHeader><CardTitle>All courses</CardTitle></CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses have been created yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>Updated</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell><Link className="font-medium hover:underline" href={`/admin/courses/${course.id}/edit`}>{course.title}</Link><p className="text-xs text-muted-foreground">/{course.slug}</p></TableCell>
                    <TableCell><Badge variant={course.status === "published" ? "default" : "secondary"}>{course.status}</Badge></TableCell>
                    <TableCell>{course.priceAmount.toLocaleString()} {course.currency}</TableCell>
                    <TableCell>{course.updatedAt.toLocaleDateString()}</TableCell>
                    <TableCell><Button asChild size="sm" variant="outline"><Link href={`/admin/courses/${course.id}/edit`}>Edit</Link></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
