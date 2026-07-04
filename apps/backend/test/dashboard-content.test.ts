import { describe, expect, it } from "vitest";
import {
  parseDashboardCaseStudyMetadataPayload,
  parseDashboardMediaUploadPayload,
  parseDashboardMediaSelectionPayload,
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
      "contentId must be a safe case-study:<slug> identifier.",
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

  it("accepts safe dashboard-created case-study IDs", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/project", {
      method: "POST",
      body: JSON.stringify({
        contentId: "case-study:new-public-system",
        locale: "en",
        status: "active-build",
        evidenceStatus: "sanitized",
        title: "New Public System",
        summary: "A newly created public case study.",
        seoDescription: "A newly created public case study from the dashboard.",
        ctaLabel: "Start a similar build",
        ctaHref: "/contact",
        achievements: "A safe public outcome.",
        structureNotes: "A safe public structure.",
      }),
    });

    await expect(parseDashboardProjectDraftPayload(request)).resolves.toMatchObject({
      contentId: "case-study:new-public-system",
      locale: "en",
      title: "New Public System",
    });
  });

  it("rejects unsafe dashboard-created case-study IDs", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/project", {
      method: "POST",
      body: JSON.stringify({
        contentId: "case-study:../private",
        locale: "en",
        status: "active-build",
        evidenceStatus: "sanitized",
        title: "Unsafe",
        summary: "Unsafe.",
        seoDescription: "Unsafe.",
        ctaLabel: "Contact",
        ctaHref: "/contact",
        achievements: "Unsafe.",
        structureNotes: "Unsafe.",
      }),
    });

    await expect(parseDashboardProjectDraftPayload(request)).rejects.toThrow(
      "contentId must be a safe case-study:<slug> identifier.",
    );
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
        selectedForPublic: true,
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
      selectedForPublic: true,
    });
  });

  it("preserves omitted media selection intent for callers that only need a direct upload URL", async () => {
    await expect(parseDashboardMediaMetadataPayload(new Request("https://aohys-preview.convex.site/dashboard/content/media", {
      method: "POST",
      body: JSON.stringify({
        storageProvider: "external",
        storageKey: "screenshots/casa-roca-secondary",
        publicUrl: "https://aohys.com/case-studies/casa-roca",
        altText: "Casa Roca secondary screenshot.",
        contentId: "case-study:casa-roca",
        usage: "case-study",
        status: "draft",
      }),
    }))).resolves.toMatchObject({
      selectedForPublic: undefined,
    });

    await expect(parseDashboardMediaUploadPayload(new Request("https://aohys-preview.convex.site/dashboard/content/media/upload-url", {
      method: "POST",
      body: JSON.stringify({
        storageKey: "media/Casa Roca Secondary",
        altText: "Casa Roca secondary upload.",
        contentId: "case-study:casa-roca",
        usage: "case-study",
      }),
    }))).resolves.toMatchObject({
      selectedForPublic: undefined,
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
        selectedForPublic: true,
      }),
    });

    await expect(parseDashboardMediaUploadPayload(request)).resolves.toEqual({
      storageKey: "media/Casa-Roca-Hero",
      altText: "Casa Roca homepage hero.",
      contentId: "case-study:casa-roca",
      usage: "case-study",
      locale: "en",
      selectedForPublic: true,
    });
  });

  it("parses media selection requests for the public Astro image", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/content/media/select", {
      method: "POST",
      body: JSON.stringify({
        mediaId: "media_123",
        contentId: "case-study:new-public-system",
      }),
    });

    await expect(parseDashboardMediaSelectionPayload(request)).resolves.toEqual({
      mediaId: "media_123",
      contentId: "case-study:new-public-system",
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
