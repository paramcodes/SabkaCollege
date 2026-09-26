import { describe, expect, it, vi } from "vitest";

import { createIframeProgressBridge } from "@/src/lib/video/iframe-bridge";

const trustedOrigin = "https://customer-abc.cloudflarestream.com";

function createBridge() {
  const target = new EventTarget();
  const frameWindow = new EventTarget() as unknown as Window;
  const onEvent = vi.fn();
  const remove = createIframeProgressBridge({
    target,
    frameWindow,
    trustedOrigin,
    onEvent,
  });
  return { target, frameWindow, onEvent, remove };
}

function dispatchMessage(
  target: EventTarget,
  source: MessageEventSource,
  origin: string,
  data: unknown,
) {
  const event = new Event("message");
  Object.defineProperties(event, {
    source: { value: source },
    origin: { value: origin },
    data: { value: data },
  });
  target.dispatchEvent(event);
}

describe("iframe progress bridge", () => {
  it("accepts only the small normalized schema from the configured frame and origin", () => {
    const { target, frameWindow, onEvent, remove } = createBridge();

    dispatchMessage(target, frameWindow, trustedOrigin, {
      type: "timeupdate",
      positionSeconds: 42,
      durationSeconds: 100,
    });
    dispatchMessage(target, frameWindow, "https://attacker.example", {
      type: "timeupdate",
      positionSeconds: 90,
      durationSeconds: 100,
    });
    dispatchMessage(target, {} as MessageEventSource, trustedOrigin, {
      type: "timeupdate",
      positionSeconds: 91,
      durationSeconds: 100,
    });
    dispatchMessage(target, frameWindow, trustedOrigin, {
      type: "timeupdate",
      positionSeconds: 90,
      durationSeconds: 100,
      extra: true,
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: "timeupdate",
      positionSeconds: 42,
      durationSeconds: 100,
    });
    remove();
  });

  it("rejects non-finite and structurally invalid provider messages", () => {
    const { target, frameWindow, onEvent, remove } = createBridge();

    for (const data of [
      { type: "progress", positionSeconds: Number.NaN, durationSeconds: 100 },
      { type: "progress", positionSeconds: 20 },
      { type: "ended", positionSeconds: "100", durationSeconds: 100 },
      null,
      "progress",
    ]) {
      dispatchMessage(target, frameWindow, trustedOrigin, data);
    }

    expect(onEvent).not.toHaveBeenCalled();
    remove();
  });

  it("removes the listener during player cleanup", () => {
    const { target, frameWindow, onEvent, remove } = createBridge();
    remove();

    dispatchMessage(target, frameWindow, trustedOrigin, {
      type: "pause",
      positionSeconds: 10,
      durationSeconds: 100,
    });

    expect(onEvent).not.toHaveBeenCalled();
  });
});
