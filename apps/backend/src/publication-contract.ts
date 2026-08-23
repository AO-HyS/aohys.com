export type PublicationScope = "project" | "resume" | "all";
export type PublicationTarget = "preview" | "production";
export type PublicationState =
  | "published-locally"
  | "release-requested"
  | "release-acknowledged"
  | "release-failed"
  | "deployed"
  | "rollback-needed";

export interface PublicationSource {
  projects: unknown[];
  resume: unknown[];
  media: unknown[];
  settings: unknown[];
}

export function canonicalizePublicationSource(source: PublicationSource) {
  return {
    projects: sortCanonical(source.projects),
    resume: sortCanonical(source.resume),
    media: sortCanonical(source.media),
    settings: sortCanonical(source.settings),
  };
}

export async function createPublicationIdentity(input: {
  scope: PublicationScope;
  contentId?: string;
  locale?: "en" | "es";
  targetEnvironment: PublicationTarget;
  source: PublicationSource;
}) {
  const canonicalSource = stableStringify(
    canonicalizePublicationSource(input.source),
  );
  const sourceRevision = await sha256(canonicalSource);
  const requestKey = await sha256(
    stableStringify({
      scope: input.scope,
      ...(input.contentId ? { contentId: input.contentId } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
      targetEnvironment: input.targetEnvironment,
      sourceRevision,
    }),
  );
  return { requestKey, sourceRevision };
}

export function parseCanonicalJson(value: string): unknown {
  const parsed: unknown = JSON.parse(value);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "Resume publication contentJson must contain a JSON object.",
    );
  }
  return parsed;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => compareCodeUnits(left, right));
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

function sortCanonical(values: unknown[]): unknown[] {
  return values
    .map((value) => ({ value, key: stableStringify(value) }))
    .sort((left, right) => compareCodeUnits(left.key, right.key))
    .map(({ value }) => value);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Runtime-neutral SHA-256: Convex mutations cannot import node:crypto.
export async function sha256(message: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
