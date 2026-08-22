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

  it("fails closed for active resume URLs", () => {
    const resume = getResumePageContent("en");
    expect(
      parseDashboardResumeContent(
        JSON.stringify({
          ...resume,
          pdf: { ...resume.pdf, href: "/downloads/%252e%252e/secrets.pdf" },
        }),
      ),
    ).toBeUndefined();
    expect(
      parseDashboardResumeContent(
        JSON.stringify({
          ...resume,
          contactLinks: [
            { label: "Unsafe", href: "javascript:alert(1)", text: "Unsafe" },
          ],
        }),
      ),
    ).toBeUndefined();
  });
});
