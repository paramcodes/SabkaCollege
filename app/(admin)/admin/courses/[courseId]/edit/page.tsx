import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

import { requireAdmin } from "@/src/lib/auth/guards";
import { getAdminCourse } from "@/src/db/queries/admin";
import { CourseForm } from "@/src/components/admin/course-form";
import { CourseStatusControl, DeleteCourseButton } from "@/src/components/admin/course-actions";
import { LessonEditor } from "@/src/components/admin/lesson-editor";
import { ModuleEditor } from "@/src/components/admin/module-editor";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export const instant = false;

const courseIdSchema = z.string().uuid();

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireAdmin();
  const { courseId: rawCourseId } = await params;
  const parsedCourseId = courseIdSchema.safeParse(rawCourseId);
  if (!parsedCourseId.success) notFound();

  const course = await getAdminCourse(parsedCourseId.data);
  if (!course) notFound();

  return (
    <div className="grid gap-8">
      <Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent hover:text-primary">
        <Link href="/admin/courses"><ArrowLeft aria-hidden="true" /> Back to courses</Link>
      </Button>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Content library</p>
          <h1 className="mt-2 font-serif text-4xl">Edit course</h1>
          <p className="mt-2 text-muted-foreground">{course.title} · /{course.slug}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <CourseStatusControl courseId={course.id} status={course.status} />
          <DeleteCourseButton courseId={course.id} />
        </div>
      </header>
      <Card>
        <CardHeader><CardTitle>Course details</CardTitle></CardHeader>
        <CardContent>
          <CourseForm course={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            shortDescription: course.shortDescription ?? "",
            description: course.description,
            coverImageUrl: course.coverImageUrl ?? "",
            status: course.status,
            priceAmount: course.priceAmount,
            currency: course.currency,
            stripeProductId: course.stripeProductId ?? "",
            stripePriceId: course.stripePriceId ?? "",
            estimatedDurationMinutes: course.estimatedDurationMinutes,
          }} />
        </CardContent>
      </Card>
      <ModuleEditor courseId={course.id} modules={course.modules} />
      {course.modules.map((courseModule) => (
        <Card key={courseModule.id}>
          <CardHeader><CardTitle>{courseModule.title}</CardTitle></CardHeader>
          <CardContent>
            <LessonEditor courseId={course.id} moduleId={courseModule.id} lessons={courseModule.lessons} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
