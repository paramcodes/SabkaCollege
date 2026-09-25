export type ProgressSaveState = "idle" | "saving" | "saved" | "error" | "unavailable";

export function getProgressSaveAnnouncement(state: ProgressSaveState): string {
  switch (state) {
    case "saving":
      return "Saving progress…";
    case "saved":
      return "Progress saved.";
    case "error":
      return "Progress could not be saved. Please try again.";
    case "unavailable":
      return "Progress tracking is unavailable for this video provider.";
    case "idle":
      return "Progress tracking is ready.";
  }
}
