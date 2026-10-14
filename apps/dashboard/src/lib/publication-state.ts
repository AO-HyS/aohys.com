import type { api } from "@aohys/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { type PublicationRequestState } from "@aohys/core/domain";
export type DashboardPublication = FunctionReturnType<
  typeof api.contentActions.publishContent
>["publication"];

export const publicationStateCopy = {
  "published-locally": "Published locally",
  "release-requested": "Release requested",
  "release-acknowledged": "Release acknowledged",
  "release-failed": "Release failed",
  deployed: "Deployed · smoke verified",
  "rollback-needed": "Rollback needed",
} as const satisfies Record<PublicationRequestState, string>;

export function publicationLabel(publication: DashboardPublication): string {
  const label = publicationStateCopy[publication.state];
  return publication.state === "release-failed" && publication.retryable
    ? `${label} · retryable`
    : label;
}
