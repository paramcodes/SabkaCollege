export type TimelineLesson = {
  slug: string;
  title: string;
  position: number;
  completed?: boolean;
  locked?: boolean;
};

export type TimelineModule = {
  title: string;
  position: number;
  lessons: TimelineLesson[];
};

export function selectLearningNavigation(
  modules: TimelineModule[],
  currentLessonSlug: string,
): {
  current: TimelineLesson;
  previous: TimelineLesson | null;
  next: TimelineLesson | null;
} | null {
  const lessons = [...modules]
    .sort((left, right) => left.position - right.position)
    .flatMap((module) =>
      [...module.lessons].sort((left, right) => left.position - right.position),
    );
  const currentIndex = lessons.findIndex(
    (lesson) => lesson.slug === currentLessonSlug,
  );

  if (currentIndex < 0) {
    return null;
  }

  return {
    current: lessons[currentIndex],
    previous: currentIndex > 0 ? lessons[currentIndex - 1] : null,
    next: currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null,
  };
}
