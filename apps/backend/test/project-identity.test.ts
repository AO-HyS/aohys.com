import { describe, expect, it } from "vitest";
import { localizedCaseStudyPath, requireCaseStudyContentId, requireSafeProjectKey, requireUnreservedStaticSlug } from "../src/project-identity.js";

describe("project identity", () => {
  it("accepts stable keys and localized slugs without coupling them", () => {
    expect(requireCaseStudyContentId("case-study:stable-key")).toBe("stable-key");
    expect(() => requireSafeProjectKey("localized-route", "Localized slug")).not.toThrow();
  });

  it.each(["Case-Study", "two--hyphens", "../unsafe", "with spaces", ""])(
    "rejects unsafe project keys and slugs: %s",
    (value) => expect(() => requireSafeProjectKey(value, "Project key")).toThrow(),
  );

  it("rejects content IDs outside the case-study namespace", () => {
    expect(() => requireCaseStudyContentId("resume:stable-key")).toThrow("case-study namespace");
  });

  it("derives each locale route from its localized slug", () => {
    expect(localizedCaseStudyPath("en", "english-route")).toBe("/case-studies/english-route");
    expect(localizedCaseStudyPath("es", "ruta-espanola")).toBe("/es/casos/ruta-espanola");
  });

  it("reserves localized static routes for their stable content owner", () => {
    expect(() => requireUnreservedStaticSlug(
      "case-study:dashboard-alpha",
      "es",
      "sistemas-enterprise",
    )).toThrow("reserved by case-study:enterprise-systems");
    expect(() => requireUnreservedStaticSlug(
      "case-study:enterprise-systems",
      "es",
      "sistemas-enterprise",
    )).not.toThrow();
  });
});
