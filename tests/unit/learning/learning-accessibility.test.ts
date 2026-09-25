import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { getCompletionAnnouncement } from "@/src/lib/learning/save-state";

const completionControlSource = readFileSync(
  fileURLToPath(
    new URL("../../../src/components/learning/completion-control.tsx", import.meta.url),
  ),
  "utf8",
);
const learningTimelineSource = readFileSync(
  fileURLToPath(
    new URL("../../../src/components/learning/learning-timeline.tsx", import.meta.url),
  ),
  "utf8",
);
const videoPlayerSource = readFileSync(
  fileURLToPath(
    new URL("../../../src/components/learning/video-player.tsx", import.meta.url),
  ),
  "utf8",
);

describe("learning accessibility semantics", () => {
  it("keeps a stable completion control with a polite status and refreshes server data", () => {
    expect(completionControlSource).toContain('aria-live="polite"');
    expect(completionControlSource).toContain('aria-pressed={isComplete}');
    expect(completionControlSource).toContain("router.refresh()");
    expect(getCompletionAnnouncement(true, 75)).toBe(
      "Lesson complete. Course progress: 75%.",
    );
    expect(getCompletionAnnouncement(false, 75)).toBe("Progress could not be saved.");
  });

  it("labels completed and current timeline lessons and makes desktop navigation sticky", () => {
    expect(learningTimelineSource).toContain('lesson.completed ? ", completed" : ""');
    expect(learningTimelineSource).toContain('aria-current={current ? "page" : undefined}');
    expect(learningTimelineSource).toContain("lg:sticky");
  });

  it("keeps a live save region and forces the latest event on cleanup", () => {
    expect(videoPlayerSource).toContain('aria-live="polite"');
    expect(videoPlayerSource).toMatch(/return \(\) => \{[\s\S]*persist\([\s\S]*true/);
    expect(videoPlayerSource).toContain("router.refresh()");
  });
});
