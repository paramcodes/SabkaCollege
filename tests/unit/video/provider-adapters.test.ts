import { describe, expect, it, vi } from "vitest";

import {
  getYouTubeEmbedConfig,
  mountYouTubeProgressAdapter,
} from "@/src/lib/video/youtube-api";
import {
  mountVimeoProgressAdapter,
  type VimeoEvent,
} from "@/src/lib/video/vimeo-player";

describe("YouTube progress adapter", () => {
  it("accepts only the safe no-cookie embed URL and adds required API parameters", () => {
    expect(
      getYouTubeEmbedConfig(
        "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
        "https://learn.example",
      ),
    ).toEqual({
      videoId: "M7lc1UVf-VE",
      iframeUrl:
        "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?enablejsapi=1&origin=https%3A%2F%2Flearn.example",
    });

    expect(
      getYouTubeEmbedConfig("https://www.youtube.com/embed/M7lc1UVf-VE", "https://learn.example"),
    ).toBeNull();
    expect(
      getYouTubeEmbedConfig(
        "https://www.youtube-nocookie.com/embed/not%2Fvalid",
        "https://learn.example",
      ),
    ).toBeNull();
  });

  it("restores playback, reports state, and destroys the player", async () => {
    let playerOptions: Record<string, unknown> | undefined;
    const setCurrentTime = vi.fn();
    const destroy = vi.fn();
    class FakePlayer {
      constructor(_element: HTMLElement, options: Record<string, unknown>) {
        playerOptions = options;
      }
      getCurrentTime() {
        return 42;
      }
      getDuration() {
        return 100;
      }
      setCurrentTime = setCurrentTime;
      destroy = destroy;
    }

    const onEvent = vi.fn();
    const cleanup = await mountYouTubeProgressAdapter({
      element: {} as HTMLElement,
      videoId: "M7lc1UVf-VE",
      initialPositionSeconds: 42,
      origin: "https://learn.example",
      onEvent,
      loadApi: async () => ({ Player: FakePlayer }),
    });

    const events = playerOptions?.events as Record<
      string,
      (event: unknown) => void
    >;
    const target = {
      getCurrentTime: () => 42,
      getDuration: () => 100,
      setCurrentTime,
      destroy,
    };
    events.onReady?.({ target });
    expect(playerOptions).toMatchObject({
      videoId: "M7lc1UVf-VE",
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        rel: 0,
        enablejsapi: 1,
        origin: "https://learn.example",
      },
    });

    events.onStateChange?.({ target, data: 1 });
    events.onStateChange?.({ target, data: 2 });
    events.onStateChange?.({ target, data: 0 });
    expect(onEvent).toHaveBeenCalledWith({
      type: "pause",
      positionSeconds: 42,
      durationSeconds: 100,
    });
    expect(onEvent).toHaveBeenCalledWith({
      type: "ended",
      positionSeconds: 42,
      durationSeconds: 100,
    });

    cleanup();
    expect(destroy).toHaveBeenCalledOnce();
  });
});

describe("Vimeo progress adapter", () => {
  it("attaches to the iframe, restores position, reports events, and cleans up", async () => {
    const handlers = new Map<string, (event: VimeoEvent) => void>();
    const iframe = {} as HTMLIFrameElement;
    const setCurrentTime = vi.fn(async () => 0);
    const off = vi.fn();
    const destroy = vi.fn(async () => undefined);

    class FakeVimeoPlayer {
      constructor(element: HTMLIFrameElement) {
        expect(element).toBe(iframe);
      }
      on(event: string, handler: (value: VimeoEvent) => void) {
        handlers.set(event, handler);
      }
      off = off;
      destroy = destroy;
      setCurrentTime = setCurrentTime;
      async getCurrentTime() {
        return 24;
      }
      async getDuration() {
        return 120;
      }
    }

    const onEvent = vi.fn();
    const cleanup = await mountVimeoProgressAdapter({
      iframe,
      initialPositionSeconds: 24,
      onEvent,
      loadPlayer: async () => ({ default: FakeVimeoPlayer }),
    });

    expect(setCurrentTime).toHaveBeenCalledWith(24);
    handlers.get("timeupdate")?.({ seconds: 24, duration: 120 });
    handlers.get("play")?.({ seconds: 24, duration: 120 });
    handlers.get("pause")?.({ seconds: 24, duration: 120 });
    handlers.get("ended")?.({ seconds: 120, duration: 120 });
    expect(onEvent).toHaveBeenCalledWith({
      type: "timeupdate",
      positionSeconds: 24,
      durationSeconds: 120,
    });
    expect(onEvent).toHaveBeenCalledWith({
      type: "ended",
      positionSeconds: 120,
      durationSeconds: 120,
    });

    cleanup();
    expect(off).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
