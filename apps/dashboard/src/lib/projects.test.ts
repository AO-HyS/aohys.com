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
      selectedForPublic: true,
    });
  });
});
