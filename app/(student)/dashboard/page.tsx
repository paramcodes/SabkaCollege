import { BookOpen, CheckCircle2, GraduationCap } from "lucide-react";
import Link from "next/link";

import { getStudentDashboard } from "@/src/db/queries/student";
import { SiteFooter } from "@/src/components/layout/site-footer";
import { SiteHeader } from "@/src/components/layout/site-header";
import { ContinueLearning } from "@/src/components/dashboards/continue-learning";
import { CourseProgressCard } from "@/src/components/dashboards/course-progress-card";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { requireUser } from "@/src/lib/auth/guards";

export const instant = false;

export default async function StudentDashboardPage() {
  const user = await requireUser();
  const dashboard = await getStudentDashboard(user.id);
  const hasCourses = dashboard.courses.length > 0;
  const displayName = user.name?.trim() || "there";

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <header className="max-w-3xl">
            <p className="text-sm font-medium text-primary">Student dashboard</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Keep your learning moving with a clear view of your courses,
              lessons, and next step.
            </p>
          </header>

          <section
            aria-label="Overall learning progress"
            className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_1fr]"
          >
            <Card className="border-primary/20 bg-primary text-primary-foreground">
              <CardHeader>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-75">
                  Overall progress
                </p>
                <CardTitle className="mt-2 font-serif text-3xl">
                  {dashboard.overallProgress}% complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 opacity-80">
                  {dashboard.completedLessons} of {dashboard.totalLessons} lessons
                  complete across your enrolled courses.
                </p>
                <div
                  aria-label="Overall course progress"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={dashboard.overallProgress}
                  className="mt-7 h-2 overflow-hidden rounded-full bg-primary-foreground/20"
                  role="progressbar"
                >
                  <div
                    className="h-full rounded-full bg-primary-foreground transition-[width]"
                    style={{ width: `${dashboard.overallProgress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <ContinueLearning learning={dashboard.continueLearning} />
          </section>

          <section aria-labelledby="enrolled-courses-heading" className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">Your courses</p>
                <h2
                  id="enrolled-courses-heading"
                  className="mt-2 font-serif text-3xl tracking-[-0.025em]"
                >
                  Enrolled courses
                </h2>
              </div>
              {hasCourses ? (
                <p className="text-sm text-muted-foreground">
                  {dashboard.courses.length} {dashboard.courses.length === 1 ? "course" : "courses"}
                </p>
              ) : null}
            </div>

            {hasCourses ? (
              <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {dashboard.courses.map((course) => (
                  <CourseProgressCard key={course.slug} course={course} />
                ))}
              </div>
            ) : (
              <Card className="mt-7 border-dashed bg-card shadow-none ring-1 ring-foreground/15">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
                    <GraduationCap className="size-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="mt-3 font-serif text-2xl">
                    Your next chapter starts here
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="max-w-xl leading-7 text-muted-foreground">
                    You do not have any paid courses yet. Explore the catalogue to
                    find a course that fits your goals.
                  </p>
                  <Button asChild className="mt-6">
                    <Link href="/courses">
                      <BookOpen aria-hidden="true" /> Browse courses
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {hasCourses && dashboard.courses.some((course) => course.isComplete) ? (
            <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              Completed courses remain available for review.
            </p>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
