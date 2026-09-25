"use client";

import { useCallback, useEffect, useRef } from "react";

import { saveLessonProgress } from "@/src/actions/progress";
import { clampProgressEvent } from "@/src/lib/video/player-events";
import type { VideoProvider } from "@/src/lib/video/providers";

type VideoPlayerProps = {
  title: string;
  courseSlug: string;
  lessonSlug: string;
  provider: VideoProvider;
  embedUrl: string | null;
  durationSeconds: number;
  initialPositionSeconds: number;
};

const SAVE_INTERVAL_MS = 15_000;

export function VideoPlayer({
  title,
  courseSlug,
  lessonSlug,
  provider,
  embedUrl,
  durationSeconds,
  initialPositionSeconds,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedAtRef = useRef(0);
  const latestPositionRef = useRef(initialPositionSeconds);
  const latestDurationRef = useRef(durationSeconds);
  const hasPlayedRef = useRef(false);

  const persist = useCallback(
    (positionSeconds: number, eventDuration: number, force = false) => {
      const now = Date.now();
      if (!force && now - lastSavedAtRef.current < SAVE_INTERVAL_MS) {
        return;
      }

      const progress = clampProgressEvent({
        positionSeconds,
        durationSeconds: eventDuration,
      });
      latestPositionRef.current = progress.lastPositionSeconds;
      latestDurationRef.current = eventDuration;
      lastSavedAtRef.current = now;
      void saveLessonProgress({
        courseSlug,
        lessonSlug,
        lastPositionSeconds: progress.lastPositionSeconds,
        maxWatchedPercentage: progress.maxWatchedPercentage,
      });
    },
    [courseSlug, lessonSlug],
  );

  useEffect(() => {
    return () => {
      if (hasPlayedRef.current) {
        persist(latestPositionRef.current, latestDurationRef.current, true);
      }
    };
  }, [persist]);

  if (!embedUrl) {
    return (
      <div className="grid aspect-video place-items-center border border-foreground/20 bg-secondary/40 p-8 text-center">
        <div>
          <p className="font-serif text-2xl">Video unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This lesson does not have a supported external video source.
          </p>
        </div>
      </div>
    );
  }

  if (provider === "mux") {
    return (
      <video
        ref={videoRef}
        className="aspect-video w-full bg-foreground"
        controls
        playsInline
        preload="metadata"
        src={embedUrl}
        aria-label={`${title} video`}
        onLoadedMetadata={(event) => {
          const player = event.currentTarget;
          const mediaDuration = Number.isFinite(player.duration)
            ? player.duration
            : durationSeconds;
          latestDurationRef.current = mediaDuration;
          const restore = clampProgressEvent({
            positionSeconds: initialPositionSeconds,
            durationSeconds: mediaDuration,
          });
          if (restore.lastPositionSeconds > 0) {
            player.currentTime = restore.lastPositionSeconds;
          }
        }}
        onPlay={() => {
          hasPlayedRef.current = true;
        }}
        onTimeUpdate={(event) => {
          const player = event.currentTarget;
          persist(player.currentTime, player.duration || durationSeconds);
        }}
        onPause={(event) => {
          const player = event.currentTarget;
          hasPlayedRef.current = true;
          persist(player.currentTime, player.duration || durationSeconds, true);
        }}
        onEnded={(event) => {
          const player = event.currentTarget;
          hasPlayedRef.current = true;
          persist(player.duration || durationSeconds, player.duration || durationSeconds, true);
        }}
      >
        Your browser does not support video playback.
      </video>
    );
  }

  return (
    <iframe
      className="aspect-video w-full bg-foreground"
      src={embedUrl}
      title={`${title} video`}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
    />
  );
}
