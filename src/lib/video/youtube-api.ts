const YOUTUBE_EMBED_HOST = "www.youtube-nocookie.com";
const YOUTUBE_API_HOST = "https://www.youtube-nocookie.com";

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  setCurrentTime: (seconds: number) => void;
  destroy: () => void;
};

export type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
      };
    },
  ) => YouTubePlayer;
};

type YouTubeWindow = Window & {
  YT?: YouTubeApi;
  onYouTubeIframeAPIReady?: (() => void) | null;
};

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube iframe API requires a browser."));
  }

  const youtubeWindow = window as YouTubeWindow;
  if (youtubeWindow.YT?.Player) {
    return Promise.resolve(youtubeWindow.YT);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousCallback = youtubeWindow.onYouTubeIframeAPIReady;
    const finish = () => {
      if (youtubeWindow.YT?.Player) {
        resolve(youtubeWindow.YT);
      } else {
        reject(new Error("The YouTube iframe API loaded without a player."));
      }
    };

    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      finish();
    };

    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      document.head.append(script);
    }
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("The YouTube iframe API could not be loaded.")),
      { once: true },
    );
  }).catch((error: unknown) => {
    apiPromise = null;
    throw error;
  });

  return apiPromise;
}

/** Re-derives SDK parameters from the server-approved no-cookie embed URL. */
export function getYouTubeEmbedConfig(embedUrl: string, origin: string) {
  try {
    const url = new URL(embedUrl);
    const match = /^\/embed\/([A-Za-z0-9_-]{6,20})$/.exec(url.pathname);
    if (
      url.protocol !== "https:" ||
      url.hostname !== YOUTUBE_EMBED_HOST ||
      url.port ||
      url.username ||
      url.password ||
      !match
    ) {
      return null;
    }

    const iframeUrl = new URL(embedUrl);
    iframeUrl.searchParams.set("enablejsapi", "1");
    iframeUrl.searchParams.set("origin", origin);
    return { videoId: match[1], iframeUrl: iframeUrl.toString() };
  } catch {
    return null;
  }
}

export async function mountYouTubeProgressAdapter({
  element,
  videoId,
  initialPositionSeconds,
  origin = window.location.origin,
  onEvent,
  loadApi,
}: {
  element: HTMLElement;
  videoId: string;
  initialPositionSeconds: number;
  origin?: string;
  onEvent: (event: {
    type: "loadedmetadata" | "timeupdate" | "play" | "pause" | "ended";
    positionSeconds: number;
    durationSeconds: number;
  }) => void;
  loadApi?: () => Promise<YouTubeApi>;
}): Promise<() => void> {
  const api = loadApi ? await loadApi() : await loadYouTubeIframeApi();
  let timer: ReturnType<typeof setInterval> | undefined;
  let destroyed = false;
  const emit = (
    type: "loadedmetadata" | "timeupdate" | "play" | "pause" | "ended",
    player: YouTubePlayer,
  ) => {
    onEvent({
      type,
      positionSeconds: player.getCurrentTime(),
      durationSeconds: player.getDuration(),
    });
  };
  const player = new api.Player(element, {
    videoId,
    host: YOUTUBE_API_HOST,
    playerVars: { rel: 0, enablejsapi: 1, origin },
    events: {
      onReady: ({ target }) => {
        if (destroyed) return;
        if (initialPositionSeconds > 0) {
          target.setCurrentTime(initialPositionSeconds);
        }
        emit("loadedmetadata", target);
        timer = setInterval(() => emit("timeupdate", target), 1_000);
      },
      onStateChange: ({ data, target }) => {
        if (destroyed) return;
        if (data === 1) emit("play", target);
        if (data === 2) emit("pause", target);
        if (data === 0) emit("ended", target);
      },
    },
  });

  return () => {
    if (!destroyed) {
      destroyed = true;
      if (timer) clearInterval(timer);
      player.destroy();
    }
  };
}
