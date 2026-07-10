import { STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID } from "@aohys/content-graph";
import { DASHBOARD_PUBLIC_MEDIA_BY_CONTENT_ID } from "../../generated/dashboard-public-media";

export const BRAND_FALLBACK_SRC = "/images/brand/aohys-portal-mark-v2.svg";

export function resolveProofMedia(
  contentId: string,
  evidenceSrc?: string,
  evidenceAlt?: string,
  evidenceKind?: string,
  preferFull = false,
) {
  const dashboardMedia = DASHBOARD_PUBLIC_MEDIA_BY_CONTENT_ID[contentId];
  const staticMedia = STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID[contentId];
  const candidates = [
    ...(preferFull ? [dashboardMedia?.src, dashboardMedia?.thumbSrc] : [dashboardMedia?.thumbSrc, dashboardMedia?.src]),
    ...(preferFull ? [staticMedia?.src, staticMedia?.thumbSrc] : [staticMedia?.thumbSrc, staticMedia?.src]),
    evidenceSrc,
    BRAND_FALLBACK_SRC,
  ].filter((src, index, values): src is string => Boolean(src) && values.indexOf(src) === index);

  return {
    src: candidates[0] ?? BRAND_FALLBACK_SRC,
    candidates,
    alt: dashboardMedia?.alt ?? evidenceAlt ?? staticMedia?.alt ?? "AOHYS product system",
    kind: dashboardMedia?.kind ?? staticMedia?.kind ?? evidenceKind ?? "diagram",
  };
}
