import { describe, expect, it, vi } from "vitest";
import type { CreateProjectRequest } from "@/api";
import {
  runProjectCreation,
  runProjectMediaUpload,
  runProjectPublication,
} from "@/lib/projects-workflow";

describe("Projects workflow", () => {
  it("creates both locale drafts through one atomic request with independent routes", async () => {
    const createProject = vi.fn(async (_request: CreateProjectRequest) => undefined);
    const contentId = await runProjectCreation({
      title: "AOHYS",
      spanishTitle: "AOHYS Español",
      contentKey: "aohys",
      englishSlug: "aohys-platform",
      spanishSlug: "plataforma-aohys",
      status: "active-build",
    }, createProject);

    expect(contentId).toBe("case-study:aohys");
    expect(createProject).toHaveBeenCalledTimes(1);
    expect(createProject).toHaveBeenCalledWith(expect.objectContaining({
      contentKey: "aohys",
      en: expect.objectContaining({ localizedSlug: "aohys-platform" }),
      es: expect.objectContaining({ localizedSlug: "plataforma-aohys" }),
    }));
    expect(createProject.mock.calls[0]?.[0].en).not.toHaveProperty("ctaHref");
    expect(createProject.mock.calls[0]?.[0].es).not.toHaveProperty("ctaHref");
  });

  it("runs upload slot, file transfer, and metadata registration in order", async () => {
    const calls: string[] = [];
    const file = new File(["proof"], "proof.png", { type: "image/png" });
    await runProjectMediaUpload({
      storageKey: "media/aohys/proof",
      altText: "  Sanitized AOHYS proof.  ",
      contentId: "case-study:aohys",
      usage: "case-study",
      selectedForPublic: true,
    }, file, {
      createUpload: async () => {
        calls.push("create");
        return { imageId: "image-id", publicUrl: "https://imagedelivery.net/hash/image-id/public", uploadURL: "https://upload.example.com" };
      },
      uploadFile: async () => { calls.push("upload"); },
      saveMetadata: async (metadata) => {
        calls.push("save");
        expect(metadata.altText).toBe("Sanitized AOHYS proof.");
      },
    });

    expect(calls).toEqual(["create", "upload", "save"]);
  });

  it("publishes only through the explicit project scope contract", async () => {
    const publish = vi.fn(async () => ({
      publishedAt: 1,
      projectDraftsPublished: 2,
      resumeDraftsPublished: 0,
      mediaPublished: 1,
      workflow: { status: "not-configured" as const, reason: "Missing token" },
    }));

    await runProjectPublication({ contentId: "case-study:aohys" }, publish);
    expect(publish).toHaveBeenCalledWith({ scope: "project", contentId: "case-study:aohys" });
  });
});
