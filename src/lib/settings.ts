type MutationResult<T> =
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: string;
    };

export function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function normalizeWorkspacePayload(
  body: Record<string, unknown>,
  fallback: {
    description: string | null;
    logoUrl: string | null;
  }
): MutationResult<{
  name: string;
  description: string | null;
  logoUrl: string | null;
}> {
  const name = normalizeText(body.name);
  const description = Object.prototype.hasOwnProperty.call(body, "description")
    ? normalizeText(body.description)
    : fallback.description;
  const logoUrl = Object.prototype.hasOwnProperty.call(body, "logoUrl")
    ? normalizeUrl(body.logoUrl)
    : fallback.logoUrl;

  if (!name) {
    return { error: "Workspace adı zorunludur." };
  }

  if (logoUrl === undefined) {
    return { error: "Logo URL gecersiz." };
  }

  return {
    data: {
      name,
      description,
      logoUrl,
    },
  };
}

export function normalizeProfilePayload(
  body: Record<string, unknown>
): MutationResult<{
  name: string;
  image: string | null;
}> {
  const name = normalizeText(body.name);
  const image = Object.prototype.hasOwnProperty.call(body, "image") ? normalizeUrl(body.image) : null;

  if (!name) {
    return { error: "Ad alanı zorunludur." };
  }

  if (image === undefined) {
    return { error: "Avatar URL gecersiz." };
  }

  return {
    data: {
      name,
      image,
    },
  };
}
