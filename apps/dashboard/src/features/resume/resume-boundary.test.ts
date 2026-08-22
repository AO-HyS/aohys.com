import { describe, expect, it } from "vitest";
import { getResumePageContent } from "@aohys/content-graph";
import { parseDashboardResumeContent } from "./resume-boundary";

describe("resume JSON boundary", () => {
  it("accepts the feature view model and rejects partial JSON", () => {
    const resume = getResumePageContent("en");
    expect(parseDashboardResumeContent(JSON.stringify(resume))).toEqual(resume);
    expect(
      parseDashboardResumeContent('{"name":"Incomplete"}'),
    ).toBeUndefined();
    expect(
      parseDashboardResumeContent(
        JSON.stringify({
          ...resume,
          projects: [{ title: "Missing nested fields" }],
        }),
      ),
    ).toBeUndefined();
    expect(parseDashboardResumeContent("not-json")).toBeUndefined();
  });
});
