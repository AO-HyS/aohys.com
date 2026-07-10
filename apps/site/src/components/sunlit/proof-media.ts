import { STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID } from "@aohys/content-graph";
import { DASHBOARD_PUBLIC_MEDIA_BY_CONTENT_ID } from "../../generated/dashboard-public-media";

export const BRAND_FALLBACK_SRC = "/images/brand/aohys-logo.png";

export function resolveProofMedia(
  contentId: string,
  evidenceSrc?: string,
  evidenceAlt?: string,
  evidenceKind?: string,
) {
  const dashboardMedia = DASHBOARD_PUBLIC_MEDIA_BY_CONTENT_ID[contentId];
  const staticMedia = STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID[contentId];
  const candidates = [
    dashboardMedia?.thumbSrc,
    dashboardMedia?.src,
    staticMedia?.thumbSrc,
    staticMedia?.src,
    evidenceSrc,
    BRAND_FALLBACK_SRC,
  ].filter((src, index, values): src is string => Boolean(src) && values.indexOf(src) === index);

  return {
    src: candidates[0] ?? BRAND_FALLBACK_SRC,
    candidates,
    alt: dashboardMedia?.alt ?? staticMedia?.alt ?? evidenceAlt ?? "AOHYS public project evidence",
    kind: dashboardMedia?.kind ?? staticMedia?.kind ?? evidenceKind ?? "diagram",
  };
}
