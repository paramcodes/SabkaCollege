export type VimeoEvent =
  | { seconds: number; duration: number }
  | { currentTime: number; duration: number };

type VimeoPlayer = {
  on: (event: string, handler: (value: VimeoEvent) => void) => void;
  off: (event: string, handler: (value: VimeoEvent) => void) => void;
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
  setCurrentTime: (seconds: number) => Promise<number>;
  destroy: () => Promise<void>;
};

type VimeoPlayerConstructor = new (element: HTMLIFrameElement) => VimeoPlayer;
type VimeoPlayerModule = { default: VimeoPlayerConstructor };

/** Loads the browser-only Vimeo SDK without adding it to the server bundle. */
export async function mountVimeoProgressAdapter({
  iframe,
  initialPositionSeconds,
  onEvent,
  loadPlayer = async () => {
    const vimeoModule = await import("@vimeo/player");
    return {
      default: vimeoModule.default as unknown as VimeoPlayerConstructor,
    };
  },
}: {
  iframe: HTMLIFrameElement;
  initialPositionSeconds: number;
  onEvent: (event: {
    type: "timeupdate" | "play" | "pause" | "ended";
    positionSeconds: number;
    durationSeconds: number;
  }) => void;
  loadPlayer?: () => Promise<VimeoPlayerModule>;
}): Promise<() => void> {
  const { default: VimeoPlayer } = await loadPlayer();
  const player = new VimeoPlayer(iframe);
  const handlers: Array<[string, (value: VimeoEvent) => void]> = [];
  const addHandler = (type: "timeupdate" | "play" | "pause" | "ended") => {
    const handler = (event: VimeoEvent) => {
      void (async () => {
        const durationSeconds = Number.isFinite(event.duration)
          ? event.duration
          : await player.getDuration();
        const eventPosition =
          "seconds" in event
            ? event.seconds
            : "currentTime" in event
              ? event.currentTime
              : await player.getCurrentTime();
        onEvent({ type, positionSeconds: eventPosition, durationSeconds });
      })();
    };
    player.on(type, handler);
    handlers.push([type, handler]);
  };

  addHandler("timeupdate");
  addHandler("play");
  addHandler("pause");
  addHandler("ended");
  if (initialPositionSeconds > 0) {
    await player.setCurrentTime(initialPositionSeconds);
  }

  return () => {
    for (const [event, handler] of handlers) {
      player.off(event, handler);
    }
    void player.destroy();
  };
}
