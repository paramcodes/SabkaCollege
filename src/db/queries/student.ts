import "server-only";

import { asc, desc } from "drizzle-orm";

import { db } from "@/src/db";
import { courses, lessonProgress, lessons, modules } from "@/src/db/schema";
import { userIdSchema } from "@/src/lib/validation/progress";
import {
  buildStudentDashboardData,
  type StudentDashboardData,
} from "@/src/lib/student-dashboard";
import {
  progressForUserWhere,
  studentDashboardCourseColumns,
  studentDashboardCourseWhere,
  studentDashboardProgressColumns,
} from "./query-boundaries";

export type {
  ContinueLearningData,
  StudentDashboardCourse,
  StudentDashboardData,
  StudentDashboardLesson,
  StudentDashboardModule,
} from "@/src/lib/student-dashboard";

/**
 * Reads the dashboard for a server-derived Clerk identity. The paid-purchase
 * boundary is part of the course query, and both reads run once in parallel so
 * rendering never creates a query-per-course pattern.
 */
export async function getStudentDashboard(
  userId: string,
): Promise<StudentDashboardData> {
  const parsedUserId = userIdSchema.parse(userId);

  const [courseRows, progressRows] = await Promise.all([
    db.query.courses.findMany({
      columns: studentDashboardCourseColumns,
      where: studentDashboardCourseWhere(parsedUserId),
      orderBy: [asc(courses.title), asc(courses.slug)],
      with: {
        modules: {
          columns: {
            title: true,
            position: true,
          },
          orderBy: [asc(modules.position)],
          with: {
            lessons: {
              columns: {
                id: true,
                slug: true,
                title: true,
                position: true,
              },
              orderBy: [asc(lessons.position)],
            },
          },
        },
      },
    }),
    db
      .select(studentDashboardProgressColumns)
      .from(lessonProgress)
      .where(progressForUserWhere(parsedUserId))
      .orderBy(desc(lessonProgress.updatedAt)),
  ]);

  return buildStudentDashboardData(courseRows, progressRows);
}
