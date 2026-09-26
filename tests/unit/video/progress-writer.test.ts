import { describe, expect, it } from "vitest";

import { createSerialProgressWriter } from "@/src/lib/video/progress-writer";
import { getProgressSaveAnnouncement } from "@/src/lib/video/save-state";

describe("serial progress writer", () => {
  it("starts each write only after the previous write settles", async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const writer = createSerialProgressWriter(async (value) => {
      order.push(`start:${value}`);
      if (value === "first") {
        await firstPending;
      }
      order.push(`end:${value}`);
    });

    const first = writer("first");
    const second = writer("second");
    await Promise.resolve();

    expect(order).toEqual(["start:first"]);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(order).toEqual([
      "start:first",
      "end:first",
      "start:second",
      "end:second",
    ]);
  });
});

describe("progress save announcements", () => {
  it("provides distinct polite live-region text for each persistence state", () => {
    expect(getProgressSaveAnnouncement("idle")).toBe("Progress tracking is ready.");
    expect(getProgressSaveAnnouncement("saving")).toBe("Saving progress…");
    expect(getProgressSaveAnnouncement("saved")).toBe("Progress saved.");
    expect(getProgressSaveAnnouncement("error")).toBe(
      "Progress could not be saved. Please try again.",
    );
    expect(getProgressSaveAnnouncement("unavailable")).toBe(
      "Progress tracking is unavailable for this video provider.",
    );
  });
});
