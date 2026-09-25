import { describe, expect, it } from "vitest";

import {
  clampProgressEvent,
  type VideoProviderEvent,
} from "@/src/lib/video/player-events";

describe("clampProgressEvent", () => {
  it("clamps negative and over-duration positions", () => {
    expect(
      clampProgressEvent({ positionSeconds: -20, durationSeconds: 120 }),
    ).toEqual({ lastPositionSeconds: 0, maxWatchedPercentage: 0 });
    expect(
      clampProgressEvent({ positionSeconds: 180, durationSeconds: 120 }),
    ).toEqual({ lastPositionSeconds: 120, maxWatchedPercentage: 1 });
  });

  it("derives a bounded percentage for normal playback", () => {
    expect(
      clampProgressEvent({ positionSeconds: 45, durationSeconds: 120 }),
    ).toEqual({ lastPositionSeconds: 45, maxWatchedPercentage: 0.375 });
  });

  it("handles missing or non-finite duration values safely", () => {
    expect(
      clampProgressEvent({ positionSeconds: 45, durationSeconds: 0 }),
    ).toEqual({ lastPositionSeconds: 0, maxWatchedPercentage: 0 });
    expect(
      clampProgressEvent({ positionSeconds: Number.NaN, durationSeconds: 120 }),
    ).toEqual({ lastPositionSeconds: 0, maxWatchedPercentage: 0 });
  });
});

describe("VideoProviderEvent", () => {
  it("describes provider progress and lifecycle events", () => {
    const event: VideoProviderEvent = {
      type: "pause",
      positionSeconds: 30,
      durationSeconds: 60,
    };
    expect(event.type).toBe("pause");
  });
});
