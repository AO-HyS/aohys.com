import { describe, expect, it } from "vitest";
import {
  parseDashboardCaseStudyMetadataPayload,
  parseDashboardMediaMetadataPayload,
  parseDashboardResumeVersionPayload,
  parseDashboardSiteSettingPayload,
} from "../src/dashboard-content.js";

describe("dashboard content HTTP boundary", () => {
  it("parses safe case-study metadata updates for known public content IDs", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/case-study", {
      method: "POST",
      body: JSON.stringify({
        contentId: "case-study:casa-roca",
        status: "production-proof",
        evidenceStatus: "sanitized",
      }),
    });

    await expect(parseDashboardCaseStudyMetadataPayload(request)).resolves.toEqual({
      contentId: "case-study:casa-roca",
      status: "production-proof",
      evidenceStatus: "sanitized",
    });
  });

  it("rejects private content IDs and unsupported evidence states", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/case-study", {
      method: "POST",
      body: JSON.stringify({
        contentId: "dashboard:lead-review",
        status: "production-proof",
        evidenceStatus: "private",
      }),
    });

    await expect(parseDashboardCaseStudyMetadataPayload(request)).rejects.toThrow(
      "contentId is not supported.",
    );
  });

  it("parses media metadata only when alt text and public-safe usage intent are present", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/media", {
      method: "POST",
      body: JSON.stringify({
        storageProvider: "external",
        storageKey: "screenshots/casa-roca-home",
        publicUrl: "https://aohys.com/case-studies/casa-roca",
        altText: "Casa Roca public landing page screenshot.",
        contentId: "case-study:casa-roca",
        usage: "case-study",
        status: "draft",
        locale: "en",
      }),
    });

    await expect(parseDashboardMediaMetadataPayload(request)).resolves.toEqual({
      storageProvider: "external",
      storageKey: "screenshots/casa-roca-home",
      publicUrl: "https://aohys.com/case-studies/casa-roca",
      altText: "Casa Roca public landing page screenshot.",
      contentId: "case-study:casa-roca",
      usage: "case-study",
      status: "draft",
      locale: "en",
    });
  });

  it("rejects media metadata without accessible alt text", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/media", {
      method: "POST",
      body: JSON.stringify({
        storageProvider: "external",
        storageKey: "screenshots/casa-roca-home",
        altText: " ",
        usage: "case-study",
        status: "draft",
      }),
    });

    await expect(parseDashboardMediaMetadataPayload(request)).rejects.toThrow(
      "Media alt text is required.",
    );
  });

  it("parses public-safe site setting and resume version payloads", async () => {
    await expect(parseDashboardSiteSettingPayload(new Request("https://aohys-preview.convex.site/dashboard/content/setting", {
      method: "POST",
      body: JSON.stringify({
        key: "PUBLIC_WHATSAPP_URL",
        environment: "preview",
        value: "https://wa.me/522299020825",
        classification: "public-build-value",
      }),
    }))).resolves.toEqual({
      key: "PUBLIC_WHATSAPP_URL",
      environment: "preview",
      value: "https://wa.me/522299020825",
      classification: "public-build-value",
    });

    await expect(parseDashboardResumeVersionPayload(new Request("https://aohys-preview.convex.site/dashboard/content/resume", {
      method: "POST",
      body: JSON.stringify({
        locale: "en",
        version: "2026.06",
        pdfPath: "/downloads/alejandro-ortiz-corro-resume.pdf",
        isPublished: true,
      }),
    }))).resolves.toEqual({
      locale: "en",
      version: "2026.06",
      pdfPath: "/downloads/alejandro-ortiz-corro-resume.pdf",
      isPublished: true,
    });
  });
});
