import { useCallback, useMemo } from "react";
import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import { getResumePageContent } from "@aohys/content-graph";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import type {
  DashboardLocale,
  DashboardResumeContent,
  ResumeContent,
} from "./resume-types";

export type ResumeVersionRequest = FunctionArgs<
  typeof convexApi.content.createResumeVersion
>;
export type ResumeDraftRequest = FunctionArgs<
  typeof convexApi.content.upsertResumeDraft
>;

export function useResumeContent(): ResumeContent | undefined {
  const content = useQuery(convexApi.content.listForDashboard, {});
  return useMemo(
    () =>
      content
        ? {
            resumeContent: {
              en: getResumePageContent("en") as DashboardResumeContent,
              es: getResumePageContent("es") as DashboardResumeContent,
            },
            resumeDrafts: content.resumeDrafts ?? [],
            resumeVersions: content.resumeVersions ?? [],
          }
        : undefined,
    [content],
  );
}

export function useSaveResumeVersion() {
  const mutation = useMutation(convexApi.content.createResumeVersion);
  return useCallback(
    (payload: ResumeVersionRequest) => mutation(payload),
    [mutation],
  );
}

export function useSaveResumeDraft() {
  const mutation = useMutation(convexApi.content.upsertResumeDraft);
  return useCallback(
    (payload: ResumeDraftRequest) => mutation(payload),
    [mutation],
  );
}

export function usePublishResume() {
  const action = useAction(convexApi.contentActions.publishContent);
  return useCallback(
    (locale: DashboardLocale) => action({ scope: "resume" as const, locale }),
    [action],
  );
}

export function serializeResumeDraft(content: DashboardResumeContent): string {
  return JSON.stringify(content);
}
