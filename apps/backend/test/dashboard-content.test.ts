import { describe, expect, it } from "vitest";
import {
  parseDashboardCaseStudyMetadataPayload,
  parseDashboardMediaUploadPayload,
  parseDashboardMediaMetadataPayload,
  parseDashboardPublishPayload,
  parseDashboardProjectDraftPayload,
  parseDashboardResumeDraftPayload,
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

  it("parses project drafts as the primary editable dashboard record", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/project", {
      method: "POST",
      body: JSON.stringify({
        contentId: "case-study:casa-roca",
        locale: "en",
        status: "production-proof",
        evidenceStatus: "published",
        title: "Casa Roca",
        summary: "Production hospitality site.",
        seoDescription: "Casa Roca production site proof.",
        projectUrl: "https://casa-roca.mx",
        ctaLabel: "Start a similar build",
        ctaHref: "/contact",
        achievements: "Clear public presence.",
        structureNotes: "Static public page, private workflows protected.",
      }),
    });

    await expect(parseDashboardProjectDraftPayload(request)).resolves.toEqual({
      contentId: "case-study:casa-roca",
      locale: "en",
      status: "production-proof",
      evidenceStatus: "published",
      title: "Casa Roca",
      summary: "Production hospitality site.",
      seoDescription: "Casa Roca production site proof.",
      projectUrl: "https://casa-roca.mx",
      ctaLabel: "Start a similar build",
      ctaHref: "/contact",
      achievements: "Clear public presence.",
      structureNotes: "Static public page, private workflows protected.",
    });
  });

  it("rejects project drafts with unsupported CTA hrefs", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/project", {
      method: "POST",
      body: JSON.stringify({
        contentId: "case-study:casa-roca",
        locale: "en",
        status: "production-proof",
        evidenceStatus: "published",
        title: "Casa Roca",
        summary: "Production hospitality site.",
        seoDescription: "Casa Roca production site proof.",
        ctaLabel: "Start a similar build",
        ctaHref: "javascript:alert(1)",
        achievements: "Clear public presence.",
        structureNotes: "Static public page, private workflows protected.",
      }),
    });

    await expect(parseDashboardProjectDraftPayload(request)).rejects.toThrow(
      "CTA href must be a public path or an http or https URL.",
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

  it("parses Cloudflare Images upload requests without hand-written public URLs", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/media/upload-url", {
      method: "POST",
      body: JSON.stringify({
        storageKey: "media/Casa Roca Hero",
        altText: "Casa Roca homepage hero.",
        contentId: "case-study:casa-roca",
        usage: "case-study",
        locale: "en",
      }),
    });

    await expect(parseDashboardMediaUploadPayload(request)).resolves.toEqual({
      storageKey: "media/Casa-Roca-Hero",
      altText: "Casa Roca homepage hero.",
      contentId: "case-study:casa-roca",
      usage: "case-study",
      locale: "en",
    });
  });

  it("parses resume drafts and publish requests for reviewed content", async () => {
    const contentJson = JSON.stringify({
      name: "Alejandro Ortiz Corro",
      role: "Senior Product Engineer",
      location: "Mexico",
      intro: "Builds reliable business software.",
      summary: ["Product engineer."],
      highlights: [],
      projects: [],
      experience: [],
      skills: [],
      education: [],
      languages: [],
    });

    await expect(parseDashboardResumeDraftPayload(new Request("https://aohys-preview.convex.site/dashboard/content/resume-draft", {
      method: "POST",
      body: JSON.stringify({
        locale: "en",
        contentJson,
      }),
    }))).resolves.toEqual({
      locale: "en",
      contentJson,
    });

    await expect(parseDashboardPublishPayload(new Request("https://aohys-preview.convex.site/dashboard/content/publish", {
      method: "POST",
      body: JSON.stringify({
        scope: "project",
        contentId: "case-study:casa-roca",
      }),
    }))).resolves.toEqual({
      scope: "project",
      contentId: "case-study:casa-roca",
      locale: undefined,
    });
  });
});
