import { describe, expect, it } from "vitest";

import { getPublicEmbed } from "../../../src/lib/validation/public-preview";

describe("public preview URL policy", () => {
  it("accepts a credential-free HTTPS external URL with iframe restrictions", () => {
    expect(
      getPublicEmbed("external", "https://media.example.com/previews/lesson-1"),
    ).toEqual({
      kind: "iframe",
      src: "https://media.example.com/previews/lesson-1",
      sandbox: "allow-scripts allow-presentation",
      referrerPolicy: "no-referrer",
    });
  });

  it.each([
    "http://media.example.com/preview",
    "javascript:alert(1)",
    "data:text/html,bad",
    "not a url",
    "https://user:password@media.example.com/preview",
  ])("rejects the unsafe external preview URL %j", (reference) => {
    expect(getPublicEmbed("external", reference)).toBeNull();
  });

  it("keeps the existing provider reference allow-lists", () => {
    expect(getPublicEmbed("youtube", "dQw4w9WgXcQ")).toMatchObject({
      kind: "iframe",
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
    expect(getPublicEmbed("vimeo", "123456789")).toMatchObject({
      kind: "iframe",
      src: "https://player.vimeo.com/video/123456789",
    });
    expect(getPublicEmbed("mux", "abcD1234efG5678")).toMatchObject({
      kind: "video",
      src: "https://stream.mux.com/abcD1234efG5678/public-video",
    });
    expect(
      getPublicEmbed(
        "cloudflare_stream",
        "https://customer-example.cloudflarestream.com/asset1234abcd/",
      ),
    ).toMatchObject({
      kind: "iframe",
      src: "https://customer-example.cloudflarestream.com/asset1234abcd/",
    });
  });
});
