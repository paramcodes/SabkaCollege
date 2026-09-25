const youtubeReferencePattern = /^[A-Za-z0-9_-]{6,20}$/;
const vimeoReferencePattern = /^\d{6,12}$/;
const muxReferencePattern = /^[A-Za-z0-9_-]{8,128}$/;

type PublicVideoProvider =
  | "youtube"
  | "vimeo"
  | "mux"
  | "cloudflare_stream"
  | "external";

type PublicEmbed = {
  kind: "iframe" | "video";
  src: string;
};

const getPublicEmbed = (
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
    };
  }

  if (provider === "vimeo" && vimeoReferencePattern.test(reference)) {
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${encodeURIComponent(reference)}`,
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

      if (url.protocol === "https:" && trustedHost && hasAssetPath) {
        return { kind: "iframe", src: url.toString() };
      }
    } catch {
      return null;
    }
  }

  return null;
};

export function PublicPreviewPlayer({
  title,
  provider,
  reference,
}: {
  title: string;
  provider: PublicVideoProvider;
  reference: string | null;
}) {
  const embed = getPublicEmbed(provider, reference);

  if (!embed) {
    return (
      <div className="grid aspect-video place-items-center border border-foreground/20 bg-secondary/45 p-8 text-center">
        <div>
          <p className="font-serif text-2xl">Preview player unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This lesson does not have a supported public video source.
          </p>
        </div>
      </div>
    );
  }

  if (embed.kind === "video") {
    return (
      <video
        className="aspect-video w-full bg-foreground"
        controls
        preload="metadata"
        playsInline
        src={embed.src}
      >
        Your browser does not support public preview video playback.
      </video>
    );
  }

  return (
    <iframe
      className="aspect-video w-full bg-foreground"
      src={embed.src}
      title={`${title} course preview`}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
    />
  );
}
