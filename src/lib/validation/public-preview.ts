import {
  getVideoEmbedUrl,
  type VideoProvider,
} from "@/src/lib/video/providers";

/**
 * The public preview and the protected lesson player share one policy. The
 * database enum is the single source of provider names, so the public path
 * reuses it rather than keeping a second union that can drift.
 */
export type PublicVideoProvider = VideoProvider;

export type PublicEmbed = {
  kind: "iframe" | "video";
  src: string;
  sandbox?: string;
  referrerPolicy?: "strict-origin-when-cross-origin" | "no-referrer";
};

/**
 * The public preview renders third-party frames, so it stays more locked down
 * than the signed-in player: no `allow-same-origin` on a frame we do not
 * control, and `no-referrer` on every `external` reference — including
 * configured well-known hosts, which are allow-listed by origin but are still
 * third parties.
 */
const iframeDefaults = {
  sandbox: "allow-scripts allow-same-origin allow-presentation",
  referrerPolicy: "strict-origin-when-cross-origin" as const,
};

const externalIframeDefaults = {
  sandbox: "allow-scripts allow-presentation",
  referrerPolicy: "no-referrer" as const,
};

/**
 * Resolves a preview video reference to a safe embed descriptor.
 *
 * Resolution is delegated to `getVideoEmbedUrl` so an unauthenticated visitor
 * and a paying student are subject to exactly the same allow-list: configured
 * external hosts, Cloudflare Stream path normalization, and the YouTube /
 * Vimeo / Mux reference shapes. This function adds no host of its own; a
 * reference that the protected player would reject is rejected here too, and
 * the caller renders the unavailable state.
 *
 * Call this on the server. The resolved object is a plain, serializable value
 * that the client component renders as-is.
 */
export const getPublicEmbed = (
  provider: PublicVideoProvider,
  reference: string | null,
): PublicEmbed | null => {
  const src = getVideoEmbedUrl(provider, reference);

  if (!src) {
    return null;
  }

  if (provider === "mux") {
    return { kind: "video", src };
  }

  if (provider === "external") {
    return { kind: "iframe", src, ...externalIframeDefaults };
  }

  return { kind: "iframe", src, ...iframeDefaults };
};
