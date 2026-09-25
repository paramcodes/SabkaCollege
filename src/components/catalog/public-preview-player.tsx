import {
  getPublicEmbed,
  type PublicVideoProvider,
} from "@/src/lib/validation/public-preview";

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
      referrerPolicy={embed.referrerPolicy}
      sandbox={embed.sandbox}
    />
  );
}
