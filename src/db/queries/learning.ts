import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { hasCourseAccess } from "@/src/lib/billing/entitlements";
import { courseSlugSchema } from "@/src/lib/validation/catalog-routes";
import { userIdSchema } from "@/src/lib/validation/progress";
import { calculateCourseProgress } from "@/src/lib/utils/progress";

import { db } from "..";
import { courses, lessons, lessonProgress, modules } from "../schema";

export type LearningLesson = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  videoProvider: (typeof lessons.videoProvider.enumValues)[number];
  videoReference: string | null;
  durationSeconds: number;
  isPreview: boolean;
  completed: boolean;
  lastPositionSeconds: number;
  maxWatchedPercentage: number;
  locked: boolean;
};

export type LearningView = {
  course: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string | null;
    description: string;
    estimatedDurationMinutes: number;
  };
  access: "granted" | "denied";
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
    lessons: LearningLesson[];
  }>;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  estimatedDurationMinutes: number;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
    lessons: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      position: number;
      videoProvider: (typeof lessons.videoProvider.enumValues)[number];
      videoReference: string | null;
      durationSeconds: number;
      isPreview: boolean;
    }>;
  }>;
};

const courseLearningColumns = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  estimatedDurationMinutes: true,
} as const;

const learningModuleColumns = {
  id: true,
  title: true,
  description: true,
  position: true,
} as const;

const learningLessonColumns = {
  id: true,
  slug: true,
  title: true,
  description: true,
  position: true,
  videoProvider: true,
  videoReference: true,
  durationSeconds: true,
  isPreview: true,
} as const;

function toLearningView(
  course: CourseRow,
  access: LearningView["access"],
  progressByLesson: Map<
    string,
    { lastPositionSeconds: number; maxWatchedPercentage: number; completedAt: Date | null }
  >,
): LearningView {
  const hasAccess = access === "granted";
  const orderedModules = [...course.modules]
    .sort((left, right) => left.position - right.position)
    .map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      position: module.position,
      lessons: [...module.lessons]
        .sort((left, right) => left.position - right.position)
        .map((lesson) => {
          const progress = progressByLesson.get(lesson.id);
          const completed = progress?.completedAt != null;
          return {
            ...lesson,
            // Protected query never returns a video reference without paid
            // access, including on preview lessons.
            videoReference: hasAccess ? lesson.videoReference : null,
            completed,
            lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
            maxWatchedPercentage: progress?.maxWatchedPercentage ?? 0,
            locked: !hasAccess,
          };
        }),
    }));
  const allLessons = orderedModules.flatMap((module) => module.lessons);
  const completedLessons = allLessons.filter((lesson) => lesson.completed).length;

  return {
    course: course,
    access,
    modules: orderedModules,
    totalLessons: allLessons.length,
    completedLessons,
    progressPercent: calculateCourseProgress(allLessons.length, completedLessons),
  };
}

/**
 * Loads the protected learning view for one server-derived Clerk identity.
 * The purchase check is performed before any lesson video reference can be
 * serialized to the caller.
 */
export async function getCourseLearningView(
  courseSlug: string,
  userId: string,
): Promise<LearningView | null> {
  const parsedCourseSlug = courseSlugSchema.parse(courseSlug);
  const parsedUserId = userIdSchema.parse(userId);

  const course = (await db.query.courses.findFirst({
    columns: courseLearningColumns,
    where: and(eq(courses.status, "published"), eq(courses.slug, parsedCourseSlug)),
    with: {
      modules: {
        columns: learningModuleColumns,
        orderBy: [asc(modules.position)],
        with: { lessons: { columns: learningLessonColumns, orderBy: [asc(lessons.position)] } },
      },
    },
  })) as CourseRow | null;

  if (!course) {
    return null;
  }

  const lessonIds = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => lesson.id),
  );
  const progressRows = lessonIds.length
    ? await db
        .select({
          lessonId: lessonProgress.lessonId,
          lastPositionSeconds: lessonProgress.lastPositionSeconds,
          maxWatchedPercentage: lessonProgress.maxWatchedPercentage,
          completedAt: lessonProgress.completedAt,
        })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, parsedUserId),
            inArray(lessonProgress.lessonId, lessonIds),
          ),
        )
    : [];

  const accessGranted = await hasCourseAccess(parsedUserId, course.id);
  return toLearningView(
    course,
    accessGranted ? "granted" : "denied",
    new Map(progressRows.map((progress) => [progress.lessonId, progress])),
  );
}

export async function getCourseProgressSummary(
  courseSlug: string,
  userId: string,
): Promise<number> {
  const view = await getCourseLearningView(courseSlug, userId);
  return view?.progressPercent ?? 0;
}
