export type VideoProvider =
  | "youtube"
  | "vimeo"
  | "mux"
  | "cloudflare_stream"
  | "external";

const providerIds: Record<Exclude<VideoProvider, "external" | "cloudflare_stream">, RegExp> = {
  youtube: /^[A-Za-z0-9_-]{6,20}$/,
  vimeo: /^\d{6,12}$/,
  mux: /^[A-Za-z0-9_-]{8,128}$/,
};

const builtInExternalHosts = [
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "stream.mux.com",
] as const;

function configuredExternalHosts(): Set<string> {
  const configured = [
    process.env.NEXT_PUBLIC_EXTERNAL_VIDEO_ALLOWED_HOSTS,
    process.env.EXTERNAL_VIDEO_ALLOWED_HOSTS,
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...builtInExternalHosts, ...configured]);
}

function parseSafeHttpsUrl(reference: string): URL | null {
  try {
    const url = new URL(reference);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.port ||
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost")
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function getExternalUrl(reference: string): string | null {
  const url = parseSafeHttpsUrl(reference);
  if (!url || !configuredExternalHosts().has(url.hostname.toLowerCase())) {
    return null;
  }
  return url.toString();
}

function getCloudflareStreamUrl(reference: string): string | null {
  const url = parseSafeHttpsUrl(reference);
  if (!url || !url.hostname.toLowerCase().endsWith(".cloudflarestream.com")) {
    return null;
  }

  if (!/^\/[A-Za-z0-9_-]{8,128}(?:\/iframe)?\/?$/.test(url.pathname)) {
    return null;
  }

  const normalizedPath = url.pathname.replace(/\/$/, "");
  if (normalizedPath.endsWith("/iframe")) {
    return `${url.origin}${normalizedPath}`;
  }
  return `${url.origin}${normalizedPath}/iframe`;
}

/**
 * Resolves a database video reference to a safe player URL. Provider
 * references are intentionally stricter than ordinary URLs: arbitrary HTTPS
 * hosts are not trusted unless explicitly configured.
 */
export function getVideoEmbedUrl(
  provider: VideoProvider,
  reference: string | null | undefined,
): string | null {
  if (!reference || typeof reference !== "string") {
    return null;
  }

  if (provider === "youtube" || provider === "vimeo" || provider === "mux") {
    if (!providerIds[provider].test(reference)) {
      return null;
    }
    if (provider === "youtube") {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(reference)}`;
    }
    if (provider === "vimeo") {
      return `https://player.vimeo.com/video/${encodeURIComponent(reference)}`;
    }
    return `https://stream.mux.com/${encodeURIComponent(reference)}/public-video`;
  }

  if (provider === "cloudflare_stream") {
    return getCloudflareStreamUrl(reference);
  }

  if (provider === "external") {
    return getExternalUrl(reference);
  }

  return null;
}
