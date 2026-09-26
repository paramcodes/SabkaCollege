import { afterEach, describe, expect, it, vi } from "vitest";

import { getVideoEmbedUrl } from "@/src/lib/video/providers";
import { getPublicEmbed } from "@/src/lib/validation/public-preview";

const unlistedHost = "https://media.example.com/previews/lesson-1";
const configuredHost = "https://player.staging.example.com/embed/lesson-1";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public preview and protected player share one URL policy", () => {
  it.each([
    ["youtube", "dQw4w9WgXcQ"],
    ["vimeo", "123456789"],
    ["mux", "abcD1234efG5678"],
    ["cloudflare_stream", "https://customer-example.cloudflarestream.com/asset1234abcd"],
    ["external", "https://player.vimeo.com/video/123456789"],
  ] as const)(
    "resolves %s to the same source the protected player would use",
    (provider, reference) => {
      const publicEmbed = getPublicEmbed(provider, reference);

      expect(publicEmbed?.src).toBe(getVideoEmbedUrl(provider, reference));
    },
  );

  it.each([
    ["youtube", "https://evil.example/video"],
    ["vimeo", "12345;alert(1)"],
    ["mux", "short"],
    ["cloudflare_stream", "https://customer.example.com/asset-123/iframe"],
    ["cloudflare_stream", "https://customer-example.cloudflarestream.com/asset-123/extra/path"],
    ["external", "http://player.vimeo.com/video/123456789"],
    ["external", "https://user:password@player.vimeo.com/video/123456789"],
    ["external", "javascript:alert(1)"],
    ["external", "not a url"],
  ] as const)(
    "rejects %s reference %j in both policies",
    (provider, reference) => {
      expect(getPublicEmbed(provider, reference)).toBeNull();
      expect(getVideoEmbedUrl(provider, reference)).toBeNull();
    },
  );

  it("rejects an unlisted external host for the public preview", () => {
    expect(getVideoEmbedUrl("external", unlistedHost)).toBeNull();
    expect(getPublicEmbed("external", unlistedHost)).toBeNull();
  });

  it("accepts an external host once it is configured, in both policies", () => {
    vi.stubEnv("EXTERNAL_VIDEO_ALLOWED_HOSTS", "player.staging.example.com");

    expect(getVideoEmbedUrl("external", configuredHost)).toBe(configuredHost);
    expect(getPublicEmbed("external", configuredHost)).toEqual({
      kind: "iframe",
      src: configuredHost,
      sandbox: "allow-scripts allow-presentation",
      referrerPolicy: "no-referrer",
    });
  });
});

describe("public preview embed shape", () => {
  it("renders Mux through a native video element", () => {
    expect(getPublicEmbed("mux", "abcD1234efG5678")).toEqual({
      kind: "video",
      src: "https://stream.mux.com/abcD1234efG5678/public-video",
    });
  });

  it("keeps provider frames sandboxed and referrer-limited", () => {
    expect(getPublicEmbed("youtube", "dQw4w9WgXcQ")).toMatchObject({
      kind: "iframe",
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      sandbox: "allow-scripts allow-same-origin allow-presentation",
      referrerPolicy: "strict-origin-when-cross-origin",
    });
    expect(getPublicEmbed("vimeo", "123456789")).toMatchObject({
      kind: "iframe",
      src: "https://player.vimeo.com/video/123456789",
    });
  });

  it("normalizes a Cloudflare Stream reference to the /iframe path", () => {
    expect(
      getPublicEmbed(
        "cloudflare_stream",
        "https://customer-example.cloudflarestream.com/asset1234abcd",
      ),
    ).toMatchObject({
      kind: "iframe",
      src: "https://customer-example.cloudflarestream.com/asset1234abcd/iframe",
    });
  });

  it("returns null for a missing reference", () => {
    expect(getPublicEmbed("youtube", null)).toBeNull();
    expect(getPublicEmbed("external", "")).toBeNull();
  });
});
