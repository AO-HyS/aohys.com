export type DashboardPublicationState =
  | "published-locally"
  | "release-requested"
  | "release-acknowledged"
  | "release-failed"
  | "deployed"
  | "rollback-needed";

export interface DashboardPublication {
  requestKey: string;
  publicationAttemptId?: string;
  scope: "project" | "resume" | "all";
  contentId?: string;
  locale?: "en" | "es";
  targetEnvironment: "preview" | "production";
  state: DashboardPublicationState;
  retryable: boolean;
  updatedAt: number;
}

export const publicationStateCopy = {
  "published-locally": "Published locally",
  "release-requested": "Release requested",
  "release-acknowledged": "Release acknowledged",
  "release-failed": "Release failed",
  deployed: "Deployed · smoke verified",
  "rollback-needed": "Rollback needed",
} as const satisfies Record<DashboardPublicationState, string>;

export function publicationLabel(publication: DashboardPublication): string {
  const label = publicationStateCopy[publication.state];
  return publication.state === "release-failed" && publication.retryable
    ? `${label} · retryable`
    : label;
}
