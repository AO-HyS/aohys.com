import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(dashboardRoot, relativePath), "utf8");
}

describe("dashboard app contract", () => {
  it("keeps projects as the primary routed workspace", () => {
    const main = read("src/main.tsx");
    const projects = read("src/screens/projects-screen.tsx");
    const settings = read("src/screens/settings-screen.tsx");
    const api = read("src/api.ts");
    const viteConfig = read("vite.config.ts");

    expect(main).toContain('basepath: "/dashboard"');
    expect(main).toContain('path: "/projects"');
    expect(main).toContain('path: "/case-studies"');
    expect(main).toContain('path: "/settings"');
    expect(main).toContain("@tanstack/react-router");
    expect(projects).toContain("Project workspace");
    expect(projects).toContain("Create project");
    expect(projects).toContain("This project slug already exists.");
    expect(projects).toContain("Use in Astro");
    expect(projects).toContain("No dashboard image selected");
    expect(projects).toContain('storageProvider: "cloudflare-images"');
    expect(settings).toContain("PUBLIC_WHATSAPP_URL");
    expect(projects).toContain("saveProjectDraft");
    expect(projects).toContain("selectProjectMedia");
    expect(api).toContain('/dashboard/api${path}');
    expect(api).toContain('"/content/project"');
    expect(api).toContain('"/content/media/select"');
    expect(viteConfig).toContain('base: "/dashboard-app/"');
    expect(viteConfig).toContain('entryFileNames: "assets/dashboard.js"');
    expect(viteConfig).toContain("assetFileNames:");
    expect(viteConfig).toContain('"assets/dashboard.css"');
  });
});
