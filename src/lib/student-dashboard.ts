import { calculateCourseProgress } from "@/src/lib/utils/progress";

export type StudentDashboardLesson = {
  slug: string;
  title: string;
  position: number;
  completed: boolean;
};

export type StudentDashboardModule = {
  title: string;
  position: number;
  lessons: StudentDashboardLesson[];
};

export type StudentDashboardCourse = {
  slug: string;
  title: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  estimatedDurationMinutes: number;
  modules: StudentDashboardModule[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  isComplete: boolean;
};

export type ContinueLearningData = {
  courseSlug: string;
  courseTitle: string;
  lessonSlug?: string;
  lessonTitle?: string;
  href: string;
};

export type StudentDashboardData = {
  overallProgress: number;
  totalLessons: number;
  completedLessons: number;
  courses: StudentDashboardCourse[];
  continueLearning: ContinueLearningData | null;
};

export type StudentDashboardCourseRow = {
  slug: string;
  title: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  estimatedDurationMinutes: number;
  modules: Array<{
    title: string;
    position: number;
    lessons: Array<{
      id: string;
      slug: string;
      title: string;
      position: number;
    }>;
  }>;
};

export type StudentDashboardProgressRow = {
  lessonId: string;
  completedAt: Date | null;
  updatedAt: Date;
};

type InternalLesson = StudentDashboardLesson & { id: string };
type InternalModule = Omit<StudentDashboardModule, "lessons"> & {
  lessons: InternalLesson[];
};

const learningHref = (courseSlug: string, lessonSlug?: string) =>
  lessonSlug
    ? `/learn/${encodeURIComponent(courseSlug)}/${encodeURIComponent(lessonSlug)}`
    : `/learn/${encodeURIComponent(courseSlug)}`;

/**
 * Combines the paid-course result and the current user's progress without
 * issuing a query per course. Course, module, and lesson ordering is retained
 * so the fallback learning link always points to the first incomplete lesson.
 */
export function buildStudentDashboardData(
  courseRows: StudentDashboardCourseRow[],
  progressRows: StudentDashboardProgressRow[],
): StudentDashboardData {
  const progressByLesson = new Map(
    progressRows.map((progress) => [progress.lessonId, progress]),
  );
  const internalCourses = courseRows.map((course): {
    course: StudentDashboardCourse;
    modules: InternalModule[];
  } => {
    const modules = [...course.modules]
      .sort((left, right) => left.position - right.position)
      .map<InternalModule>((module) => ({
        title: module.title,
        position: module.position,
        lessons: [...module.lessons]
          .sort((left, right) => left.position - right.position)
          .map((lesson) => ({
            id: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            position: lesson.position,
            completed: progressByLesson.get(lesson.id)?.completedAt != null,
          })),
      }));
    const lessons = modules.flatMap((module) => module.lessons);
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((lesson) => lesson.completed).length;

    return {
      course: {
        slug: course.slug,
        title: course.title,
        shortDescription: course.shortDescription,
        coverImageUrl: course.coverImageUrl,
        estimatedDurationMinutes: course.estimatedDurationMinutes,
        modules: modules.map((module) => ({
          title: module.title,
          position: module.position,
          lessons: module.lessons.map(({ slug, title, position, completed }) => ({
            slug,
            title,
            position,
            completed,
          })),
        })),
        totalLessons,
        completedLessons,
        progressPercent: calculateCourseProgress(
          totalLessons,
          completedLessons,
        ),
        isComplete: totalLessons > 0 && completedLessons === totalLessons,
      },
      modules,
    };
  });
  const courses = internalCourses.map(({ course }) => course);
  const totalLessons = courses.reduce(
    (total, course) => total + course.totalLessons,
    0,
  );
  const completedLessons = courses.reduce(
    (total, course) => total + course.completedLessons,
    0,
  );
  const recentIncompleteLessons: Array<{
    course: StudentDashboardCourse;
    lesson: InternalLesson;
    updatedAt: Date;
  }> = [];
  const firstIncompleteLessons: Array<{
    course: StudentDashboardCourse;
    lesson: InternalLesson;
  }> = [];

  internalCourses.forEach(({ course, modules }) => {
    let foundFirstIncomplete = false;

    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        if (lesson.completed) {
          return;
        }

        if (!foundFirstIncomplete) {
          firstIncompleteLessons.push({ course, lesson });
          foundFirstIncomplete = true;
        }

        const progress = progressByLesson.get(lesson.id);
        if (progress) {
          recentIncompleteLessons.push({
            course,
            lesson,
            updatedAt: progress.updatedAt,
          });
        }
      });
    });
  });

  recentIncompleteLessons.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
  const selected = recentIncompleteLessons[0] ?? firstIncompleteLessons[0];
  const continueLearning = selected
    ? {
        courseSlug: selected.course.slug,
        courseTitle: selected.course.title,
        lessonSlug: selected.lesson.slug,
        lessonTitle: selected.lesson.title,
        href: learningHref(selected.course.slug, selected.lesson.slug),
      }
    : courses[0]
      ? {
          courseSlug: courses[0].slug,
          courseTitle: courses[0].title,
          href: learningHref(courses[0].slug),
        }
      : null;

  return {
    overallProgress: calculateCourseProgress(totalLessons, completedLessons),
    totalLessons,
    completedLessons,
    courses,
    continueLearning,
  };
}
