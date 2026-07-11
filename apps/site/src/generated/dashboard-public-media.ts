export interface DashboardPublicMediaAsset {
  src: string;
  thumbSrc?: string;
  alt: string;
  kind: string;
}

export const DASHBOARD_PUBLIC_MEDIA_BY_CONTENT_ID: Record<string, DashboardPublicMediaAsset> = {};
