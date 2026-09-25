export const calculateCourseProgress = (
  totalLessons: number,
  completedLessons: number,
): number => {
  if (totalLessons <= 0) {
    return 0;
  }

  const completed = Math.min(Math.max(completedLessons, 0), totalLessons);
  return Math.round((completed / totalLessons) * 100);
};

export const shouldAutoComplete = (maxWatchedPercentage: number): boolean => {
  const percentage = Math.min(Math.max(maxWatchedPercentage, 0), 1);
  return percentage >= 0.9;
};
