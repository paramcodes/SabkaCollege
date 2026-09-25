const youtubeReferencePattern = /^[A-Za-z0-9_-]{6,20}$/;
const vimeoReferencePattern = /^\d{6,12}$/;
const muxReferencePattern = /^[A-Za-z0-9_-]{8,128}$/;

export type PublicVideoProvider =
  | "youtube"
  | "vimeo"
  | "mux"
  | "cloudflare_stream"
  | "external";

export type PublicEmbed = {
  kind: "iframe" | "video";
  src: string;
  sandbox?: string;
  referrerPolicy?: "strict-origin-when-cross-origin" | "no-referrer";
};

const iframeDefaults = {
  sandbox: "allow-scripts allow-same-origin allow-presentation",
  referrerPolicy: "strict-origin-when-cross-origin" as const,
};

export const getPublicEmbed = (
  provider: PublicVideoProvider,
  reference: string | null,
): PublicEmbed | null => {
  if (!reference) {
    return null;
  }

  if (provider === "youtube" && youtubeReferencePattern.test(reference)) {
    return {
      kind: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(reference)}`,
      ...iframeDefaults,
    };
  }

  if (provider === "vimeo" && vimeoReferencePattern.test(reference)) {
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${encodeURIComponent(reference)}`,
      ...iframeDefaults,
    };
  }

  if (provider === "mux" && muxReferencePattern.test(reference)) {
    return {
      kind: "video",
      src: `https://stream.mux.com/${encodeURIComponent(reference)}/public-video`,
    };
  }

  if (provider === "cloudflare_stream") {
    try {
      const url = new URL(reference);
      const trustedHost = url.hostname.endsWith(".cloudflarestream.com");
      const hasAssetPath = /^\/[A-Za-z0-9_-]{8,128}\/?$/.test(url.pathname);

      if (
        url.protocol === "https:" &&
        trustedHost &&
        hasAssetPath &&
        !url.username &&
        !url.password
      ) {
        return {
          kind: "iframe",
          src: url.toString(),
          ...iframeDefaults,
        };
      }
    } catch {
      return null;
    }
  }

  if (provider === "external") {
    try {
      const url = new URL(reference);

      if (
        url.protocol === "https:" &&
        url.hostname.length > 0 &&
        !url.username &&
        !url.password
      ) {
        return {
          kind: "iframe",
          src: url.toString(),
          sandbox: "allow-scripts allow-presentation",
          referrerPolicy: "no-referrer",
        };
      }
    } catch {
      return null;
    }
  }

  return null;
};
