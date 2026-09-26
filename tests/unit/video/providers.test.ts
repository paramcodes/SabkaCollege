import { afterEach, describe, expect, it, vi } from "vitest";

import { getVideoEmbedUrl } from "@/src/lib/video/providers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getVideoEmbedUrl", () => {
  it("builds privacy-safe URLs for supported provider references", () => {
    expect(getVideoEmbedUrl("youtube", "M7lc1UVf-VE")).toBe(
      "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
    );
    expect(getVideoEmbedUrl("vimeo", "123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
    expect(getVideoEmbedUrl("mux", "abc_123-DEF")).toBe(
      "https://stream.mux.com/abc_123-DEF/public-video",
    );
  });

  it("rejects arbitrary, malformed, and credentialed references", () => {
    expect(getVideoEmbedUrl("youtube", "https://evil.example/video")).toBeNull();
    expect(getVideoEmbedUrl("vimeo", "12345;alert(1)")).toBeNull();
    expect(
      getVideoEmbedUrl(
        "external",
        "https://user:password@player.vimeo.com/video/123456789",
      ),
    ).toBeNull();
    expect(getVideoEmbedUrl("external", "https://evil.example/video.mp4")).toBeNull();
    expect(getVideoEmbedUrl("external", "javascript:alert(1)")).toBeNull();
  });

  it("only accepts explicitly trusted HTTPS external hosts", () => {
    expect(
      getVideoEmbedUrl("external", "https://player.vimeo.com/video/123456789"),
    ).toBe("https://player.vimeo.com/video/123456789");
    expect(
      getVideoEmbedUrl("cloudflare_stream", "https://customer.example.com/abc/iframe"),
    ).toBeNull();
    expect(
      getVideoEmbedUrl(
        "cloudflare_stream",
        "https://customer-abc.cloudflarestream.com/asset-123/iframe",
      ),
    ).toBe("https://customer-abc.cloudflarestream.com/asset-123/iframe");
  });

  it("accepts a host added through the server allow-list only", () => {
    const unlisted = "https://player.staging.example.com/embed/lesson-1";
    const listed = "player.staging.example.com";

    expect(getVideoEmbedUrl("external", unlisted)).toBeNull();

    vi.stubEnv("EXTERNAL_VIDEO_ALLOWED_HOSTS", listed);
    expect(getVideoEmbedUrl("external", unlisted)).toBe(unlisted);
  });

  it("normalizes a Cloudflare Stream asset path to a single /iframe suffix", () => {
    expect(
      getVideoEmbedUrl(
        "cloudflare_stream",
        "https://customer-abc.cloudflarestream.com/asset-123",
      ),
    ).toBe("https://customer-abc.cloudflarestream.com/asset-123/iframe");
    expect(
      getVideoEmbedUrl(
        "cloudflare_stream",
        "https://customer-abc.cloudflarestream.com/asset-123/iframe",
      ),
    ).toBe("https://customer-abc.cloudflarestream.com/asset-123/iframe");
  });
});
