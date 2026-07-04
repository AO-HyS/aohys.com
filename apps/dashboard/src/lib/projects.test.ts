import { describe, expect, it } from "vitest";
import { buildDashboardContentPayload, type DashboardConvexContentPayload } from "./projects";

const emptyDashboardContent = {
  caseStudies: [],
  projectDrafts: [],
  resumeDrafts: [],
  media: [],
  settings: [],
  resumeVersions: [],
} as unknown as DashboardConvexContentPayload;

describe("buildDashboardContentPayload", () => {
  it("uses the Astro evidence image for content-graph project media previews", () => {
    const payload = buildDashboardContentPayload(emptyDashboardContent);
    const casaRoca = payload.projects.find((project) => project.contentId === "case-study:casa-roca");
    const contentGraphImage = casaRoca?.images.find((image) => image.source === "content-graph");

    expect(contentGraphImage).toMatchObject({
      href: "https://casa-roca.mx",
      src: "/images/proof/casa-roca-production.png",
      altText: "Casa Roca production website",
    });
  });

  it("derives Cloudflare Images preview URLs from the browser-safe account hash", () => {
    const payload = buildDashboardContentPayload({
      ...emptyDashboardContent,
      media: [
        {
          id: "media-id",
          storageProvider: "cloudflare-images",
          storageKey: "media/casa-roca/selected",
          altText: "Selected Casa Roca screenshot.",
          contentId: "case-study:casa-roca",
          usage: "case-study",
          status: "draft",
          selectedForPublic: true,
          updatedAt: 123,
        },
      ],
    } as unknown as DashboardConvexContentPayload, "cloudflare-hash");
    const casaRoca = payload.projects.find((project) => project.contentId === "case-study:casa-roca");
    const selectedMedia = casaRoca?.images.find((image) => image.source === "media-metadata");

    expect(selectedMedia).toMatchObject({
      src: "https://imagedelivery.net/cloudflare-hash/media/casa-roca/selected/public",
      href: "https://imagedelivery.net/cloudflare-hash/media/casa-roca/selected/public",
      previewStatus: "ready",
      selectedForPublic: true,
    });
  });

  it("uses a URL stored as the storage key for old external media rows", () => {
    const legacyUrl = "https://cdn.example.com/casa-roca/alternate.png";
    const payload = buildDashboardContentPayload({
      ...emptyDashboardContent,
      media: [
        {
          id: "legacy-external-media-id",
          storageProvider: "external",
          storageKey: legacyUrl,
          altText: "Alternate Casa Roca image.",
          contentId: "case-study:casa-roca",
          usage: "case-study",
          status: "draft",
          updatedAt: 456,
        },
      ],
    } as unknown as DashboardConvexContentPayload);
    const casaRoca = payload.projects.find((project) => project.contentId === "case-study:casa-roca");
    const legacyMedia = casaRoca?.images.find((image) => image.id === "legacy-external-media-id");

    expect(legacyMedia).toMatchObject({
      src: legacyUrl,
      href: legacyUrl,
      previewStatus: "ready",
    });
  });

  it("uses a public image asset path stored as the storage key", () => {
    const publicAssetPath = "images/proof/casa-roca-production.png?variant=dashboard#hero";
    const payload = buildDashboardContentPayload({
      ...emptyDashboardContent,
      media: [
        {
          id: "public-asset-media-id",
          storageProvider: "external",
          storageKey: publicAssetPath,
          altText: "Casa Roca public asset image.",
          contentId: "case-study:casa-roca",
          usage: "case-study",
          status: "draft",
          updatedAt: 457,
        },
      ],
    } as unknown as DashboardConvexContentPayload);
    const casaRoca = payload.projects.find((project) => project.contentId === "case-study:casa-roca");
    const publicAssetMedia = casaRoca?.images.find((image) => image.id === "public-asset-media-id");

    expect(publicAssetMedia).toMatchObject({
      src: "/images/proof/casa-roca-production.png?variant=dashboard#hero",
      href: "/images/proof/casa-roca-production.png?variant=dashboard#hero",
      previewStatus: "ready",
    });
  });

  it("rejects public asset storage paths with unsafe segments", () => {
    const unsafeStorageKeys = [
      "images/../outside.png",
      "/images/./same-directory.png",
      "images//empty-segment.png",
      "images/%2e%2e/encoded-parent.png",
      "images/folder%2fencoded-slash.png",
    ];
    const payload = buildDashboardContentPayload({
      ...emptyDashboardContent,
      media: unsafeStorageKeys.map((storageKey, index) => ({
        id: `unsafe-media-id-${index}`,
        storageProvider: "external",
        storageKey,
        altText: "Unsafe public asset path.",
        contentId: "case-study:casa-roca",
        usage: "case-study",
        status: "draft",
        updatedAt: 500 + index,
      })),
    } as unknown as DashboardConvexContentPayload);
    const casaRoca = payload.projects.find((project) => project.contentId === "case-study:casa-roca");

    for (const index of unsafeStorageKeys.keys()) {
      expect(casaRoca?.images.find((image) => image.id === `unsafe-media-id-${index}`)).toMatchObject({
        src: undefined,
        href: undefined,
        previewStatus: "missing-url",
      });
    }
  });

  it("marks media without a resolvable public image URL as missing a preview", () => {
    const payload = buildDashboardContentPayload({
      ...emptyDashboardContent,
      media: [
        {
          id: "legacy-cloudflare-media-id",
          storageProvider: "cloudflare-images",
          storageKey: "captura-de-pantalla-2026-03-27.png",
          altText: "Legacy upload without a delivery URL.",
          contentId: "case-study:casa-roca",
          usage: "case-study",
          status: "published",
          selectedForPublic: true,
          updatedAt: 789,
        },
      ],
    } as unknown as DashboardConvexContentPayload);
    const casaRoca = payload.projects.find((project) => project.contentId === "case-study:casa-roca");
    const legacyMedia = casaRoca?.images.find((image) => image.id === "legacy-cloudflare-media-id");

    expect(legacyMedia).toMatchObject({
      src: undefined,
      href: undefined,
      previewStatus: "missing-url",
      selectedForPublic: true,
    });
  });

  it("omits archived media rows from project image lists", () => {
    const payload = buildDashboardContentPayload({
      ...emptyDashboardContent,
      media: [
        {
          id: "archived-media-id",
          storageProvider: "external",
          storageKey: "https://cdn.example.com/archived.png",
          altText: "Archived image.",
          contentId: "case-study:casa-roca",
          usage: "case-study",
          status: "archived",
          updatedAt: 111,
        },
      ],
    } as unknown as DashboardConvexContentPayload);
    const casaRoca = payload.projects.find((project) => project.contentId === "case-study:casa-roca");

    expect(casaRoca?.images.some((image) => image.id === "archived-media-id")).toBe(false);
  });
});
