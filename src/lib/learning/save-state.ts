export function getCompletionAnnouncement(
  completed: boolean,
  courseProgress: number,
): string {
  return completed
    ? `Lesson complete. Course progress: ${courseProgress}%.`
    : "Progress could not be saved.";
}
