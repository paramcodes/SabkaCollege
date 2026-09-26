export type IframeProgressMessage = {
  type: "progress" | "timeupdate" | "pause" | "ended" | "loadedmetadata";
  positionSeconds: number;
  durationSeconds: number;
};

type BridgeTarget = Pick<Window, "addEventListener" | "removeEventListener">;

type BridgeEvent = Event & {
  source: MessageEventSource | null;
  origin: string;
  data: unknown;
};

const allowedTypes = new Set<IframeProgressMessage["type"]>([
  "progress",
  "timeupdate",
  "pause",
  "ended",
  "loadedmetadata",
]);

/**
 * Only a deliberately small provider contract crosses the iframe boundary.
 * Unknown provider payloads are ignored rather than interpreted as progress.
 */
export function normalizeIframeProgressMessage(
  data: unknown,
): IframeProgressMessage | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "durationSeconds" ||
    keys[1] !== "positionSeconds" ||
    keys[2] !== "type"
  ) {
    return null;
  }

  if (
    typeof candidate.type !== "string" ||
    !allowedTypes.has(candidate.type as IframeProgressMessage["type"]) ||
    typeof candidate.positionSeconds !== "number" ||
    typeof candidate.durationSeconds !== "number" ||
    !Number.isFinite(candidate.positionSeconds) ||
    !Number.isFinite(candidate.durationSeconds) ||
    candidate.positionSeconds < 0 ||
    candidate.durationSeconds < 0
  ) {
    return null;
  }

  return {
    type: candidate.type as IframeProgressMessage["type"],
    positionSeconds: candidate.positionSeconds,
    durationSeconds: candidate.durationSeconds,
  };
}

export function createIframeProgressBridge({
  target,
  frameWindow,
  trustedOrigin,
  onEvent,
}: {
  target: BridgeTarget;
  frameWindow: Window | null;
  trustedOrigin: string;
  onEvent: (event: IframeProgressMessage) => void;
}): () => void {
  let trustedOriginValue: string;
  try {
    trustedOriginValue = new URL(trustedOrigin).origin;
  } catch {
    trustedOriginValue = "";
  }

  const handleMessage = (event: Event) => {
    const message = event as BridgeEvent;
    if (
      !frameWindow ||
      message.source !== frameWindow ||
      message.origin !== trustedOriginValue
    ) {
      return;
    }

    const normalized = normalizeIframeProgressMessage(message.data);
    if (normalized) {
      onEvent(normalized);
    }
  };

  target.addEventListener("message", handleMessage);
  return () => target.removeEventListener("message", handleMessage);
}
