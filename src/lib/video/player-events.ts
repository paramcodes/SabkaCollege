export type VideoProviderEvent =
  | {
      type: "timeupdate" | "pause" | "ended";
      positionSeconds: number;
      durationSeconds: number;
    }
  | {
      type: "loadedmetadata";
      positionSeconds: number;
      durationSeconds: number;
    };

export type ClampedProgress = {
  lastPositionSeconds: number;
  maxWatchedPercentage: number;
};

export function clampProgressEvent({
  positionSeconds,
  durationSeconds,
}: {
  positionSeconds: number;
  durationSeconds: number;
}): ClampedProgress {
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : 0;
  const safePosition = Number.isFinite(positionSeconds)
    ? Math.max(0, positionSeconds)
    : 0;
  const lastPositionSeconds = Math.min(safePosition, safeDuration);
  const maxWatchedPercentage =
    safeDuration > 0 ? lastPositionSeconds / safeDuration : 0;

  return {
    lastPositionSeconds: Math.round(lastPositionSeconds),
    maxWatchedPercentage: Math.min(1, Math.max(0, maxWatchedPercentage)),
  };
}
