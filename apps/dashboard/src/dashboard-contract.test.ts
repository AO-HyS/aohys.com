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
    const authClient = read("src/lib/auth-client.ts");
    const projectProjection = read("src/lib/projects.ts");
    const viteConfig = read("vite.config.ts");

    expect(main).toContain('basepath: "/dashboard"');
    expect(main).toContain('path: "/projects"');
    expect(main).toContain('path: "/case-studies"');
    expect(main).toContain('path: "/settings"');
    expect(main).toContain("@tanstack/react-router");
    expect(main).toContain("ConvexBetterAuthProvider");
    expect(main).toContain("ConvexReactClient");
    expect(projects).toContain("Project workspace");
    expect(projects).toContain("Create project");
    expect(projects).toContain("This project slug already exists.");
    expect(projects).toContain("Use in Astro");
    expect(projects).toContain("No dashboard image selected");
    expect(projects).toContain('storageProvider: "cloudflare-images"');
    expect(settings).toContain("PUBLIC_WHATSAPP_URL");
    expect(projects).toContain("saveProjectDraft");
    expect(projects).toContain("selectProjectMedia");
    expect(api).toContain("useQuery(convexApi.content.listForDashboard");
    expect(api).toContain("useMutation(convexApi.content.upsertProjectDraft");
    expect(api).toContain("useMutation(convexApi.content.selectMediaForPublic");
    expect(api).toContain("useAction(convexApi.contentActions.publishContent");
    expect(api).not.toContain("/dashboard/api");
    expect(authClient).toContain("convexClient()");
    expect(authClient).toContain("crossDomainClient()");
    expect(projectProjection).toContain("buildDashboardContentPayload");
    expect(projectProjection).toContain("@aohys/content-graph");
    expect(viteConfig).toContain('base: "/dashboard-app/"');
    expect(viteConfig).toContain('entryFileNames: "assets/dashboard.js"');
    expect(viteConfig).toContain("assetFileNames:");
    expect(viteConfig).toContain('"assets/dashboard.css"');
  });
});
