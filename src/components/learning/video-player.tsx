"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { saveLessonProgress } from "@/src/actions/progress";
import { createIframeProgressBridge } from "@/src/lib/video/iframe-bridge";
import { clampProgressEvent, type VideoProviderEvent } from "@/src/lib/video/player-events";
import { createSerialProgressWriter } from "@/src/lib/video/progress-writer";
import { getProgressSaveAnnouncement, type ProgressSaveState } from "@/src/lib/video/save-state";
import type { VideoProvider } from "@/src/lib/video/providers";
import { mountVimeoProgressAdapter } from "@/src/lib/video/vimeo-player";
import { getYouTubeEmbedConfig, mountYouTubeProgressAdapter } from "@/src/lib/video/youtube-api";

type VideoPlayerProps = {
  title: string;
  courseSlug: string;
  lessonSlug: string;
  provider: VideoProvider;
  embedUrl: string | null;
  durationSeconds: number;
  initialPositionSeconds: number;
  completed: boolean;
};

type PersistValue = {
  positionSeconds: number;
  maxWatchedPercentage: number;
};

const SAVE_INTERVAL_MS = 15_000;

function isValidProgressEvent(event: VideoProviderEvent) {
  return (
    Number.isFinite(event.positionSeconds) &&
    event.positionSeconds >= 0 &&
    Number.isFinite(event.durationSeconds) &&
    event.durationSeconds >= 0
  );
}

export function VideoPlayer({
  title,
  courseSlug,
  lessonSlug,
  provider,
  embedUrl,
  durationSeconds,
  initialPositionSeconds,
  completed,
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSavedAtRef = useRef(0);
  const latestPositionRef = useRef(initialPositionSeconds);
  const latestDurationRef = useRef(durationSeconds);
  const hasPlayedRef = useRef(false);
  const [completedInSession, setCompletedInSession] = useState(false);
  const [saveState, setSaveState] = useState<ProgressSaveState>(
    embedUrl && provider !== "cloudflare_stream" && provider !== "external"
      ? "idle"
      : "unavailable",
  );

  const writer = useMemo(
    () =>
      createSerialProgressWriter(async (value: PersistValue) => {
        setSaveState("saving");
        const result = await saveLessonProgress({
          courseSlug,
          lessonSlug,
          lastPositionSeconds: value.positionSeconds,
          maxWatchedPercentage: value.maxWatchedPercentage,
        });
        if (!result.ok) {
          setSaveState("error");
          return;
        }
        setSaveState("saved");
        if (result.data.completed) {
          setCompletedInSession(true);
        }
      }),
    [courseSlug, lessonSlug],
  );

  const persist = useCallback(
    (event: VideoProviderEvent, force = false) => {
      if (!isValidProgressEvent(event)) return;

      const progress = clampProgressEvent({
        positionSeconds: event.positionSeconds,
        durationSeconds: event.durationSeconds,
      });
      // Keep the newest values even when the routine write is throttled. The
      // cleanup save must represent the player's actual last position.
      latestPositionRef.current = progress.lastPositionSeconds;
      latestDurationRef.current = event.durationSeconds;
      if (event.type === "play" || event.type === "pause" || event.type === "ended") {
        hasPlayedRef.current = true;
      }

      const now = Date.now();
      if (!force && now - lastSavedAtRef.current < SAVE_INTERVAL_MS) return;
      lastSavedAtRef.current = now;
      void writer({
        positionSeconds: progress.lastPositionSeconds,
        maxWatchedPercentage: progress.maxWatchedPercentage,
      });
    },
    [writer],
  );

  useEffect(() => {
    if (completedInSession && !completed) {
      router.refresh();
    }
  }, [completed, completedInSession, router]);

  const handleProviderEvent = useCallback(
    (event: VideoProviderEvent) => {
      persist(event, event.type === "pause" || event.type === "ended");
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (hasPlayedRef.current) {
        persist(
          {
            type: "timeupdate",
            positionSeconds: latestPositionRef.current,
            durationSeconds: latestDurationRef.current,
          },
          true,
        );
      }
    };
  }, [persist]);

  useEffect(() => {
    if (provider !== "youtube" || !embedUrl) return;
    const config = getYouTubeEmbedConfig(
      embedUrl,
      typeof window === "undefined" ? "https://placeholder.invalid" : window.location.origin,
    );
    const element = iframeRef.current;
    if (!config || !element) {
      setSaveState("unavailable");
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;
    setSaveState("idle");
    void mountYouTubeProgressAdapter({
      element,
      videoId: config.videoId,
      initialPositionSeconds,
      onEvent: handleProviderEvent,
    })
      .then((dispose) => {
        if (disposed) dispose();
        else cleanup = dispose;
      })
      .catch(() => setSaveState("unavailable"));

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [embedUrl, handleProviderEvent, initialPositionSeconds, provider]);

  useEffect(() => {
    if (provider !== "vimeo" || !embedUrl) return;
    const element = iframeRef.current;
    if (!element) {
      setSaveState("unavailable");
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;
    setSaveState("idle");
    void mountVimeoProgressAdapter({
      iframe: element,
      initialPositionSeconds,
      onEvent: handleProviderEvent,
    })
      .then((dispose) => {
        if (disposed) dispose();
        else cleanup = dispose;
      })
      .catch(() => setSaveState("unavailable"));

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [embedUrl, handleProviderEvent, initialPositionSeconds, provider]);

  useEffect(() => {
    if (provider !== "cloudflare_stream" && provider !== "external") return;
    const element = iframeRef.current;
    let trustedOrigin: string;
    try {
      if (!embedUrl || !element?.contentWindow) throw new Error("Missing trusted frame");
      trustedOrigin = new URL(embedUrl).origin;
    } catch {
      setSaveState("unavailable");
      return;
    }

    // Cloudflare Stream and arbitrary external players do not have a known
    // native progress protocol. Stay unavailable until the exact configured
    // frame proves it speaks the small, normalized bridge contract.
    const removeBridge = createIframeProgressBridge({
      target: window,
      frameWindow: element.contentWindow,
      trustedOrigin,
      onEvent: (event) => {
        setSaveState("idle");
        handleProviderEvent({
          type: event.type === "progress" ? "timeupdate" : event.type,
          positionSeconds: event.positionSeconds,
          durationSeconds: event.durationSeconds,
        });
      },
    });
    return removeBridge;
  }, [embedUrl, handleProviderEvent, provider]);

  const body = !embedUrl ? (
    <div className="grid aspect-video place-items-center border border-foreground/20 bg-secondary/40 p-8 text-center">
      <div>
        <p className="font-serif text-2xl">Video unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This lesson does not have a supported external video source.
        </p>
      </div>
    </div>
  ) : provider === "mux" ? (
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
        const restore = clampProgressEvent({
          positionSeconds: initialPositionSeconds,
          durationSeconds: mediaDuration,
        });
        if (restore.lastPositionSeconds > 0) {
          player.currentTime = restore.lastPositionSeconds;
        }
        handleProviderEvent({
          type: "loadedmetadata",
          positionSeconds: player.currentTime,
          durationSeconds: mediaDuration,
        });
      }}
      onPlay={(event) => {
        const player = event.currentTarget;
        handleProviderEvent({
          type: "play",
          positionSeconds: player.currentTime,
          durationSeconds: player.duration || durationSeconds,
        });
      }}
      onTimeUpdate={(event) => {
        const player = event.currentTarget;
        handleProviderEvent({
          type: "timeupdate",
          positionSeconds: player.currentTime,
          durationSeconds: player.duration || durationSeconds,
        });
      }}
      onPause={(event) => {
        const player = event.currentTarget;
        handleProviderEvent({
          type: "pause",
          positionSeconds: player.currentTime,
          durationSeconds: player.duration || durationSeconds,
        });
      }}
      onEnded={(event) => {
        const player = event.currentTarget;
        handleProviderEvent({
          type: "ended",
          positionSeconds: player.duration || durationSeconds,
          durationSeconds: player.duration || durationSeconds,
        });
      }}
    >
      Your browser does not support video playback.
    </video>
  ) : (
    <iframe
      ref={iframeRef}
      className="aspect-video w-full bg-foreground"
      src={embedUrl}
      title={`${title} video`}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
    />
  );

  return (
    <div>
      {body}
      <p className="mt-2 min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {getProgressSaveAnnouncement(saveState)}
      </p>
    </div>
  );
}
