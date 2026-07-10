import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getHomePageContent } from "@aohys/content-graph";
import { describe, expect, it } from "vitest";

const siteRoot = process.cwd();
const distRoot = path.join(siteRoot, "dist");

function read(relativePath: string) {
  return readFileSync(path.join(siteRoot, relativePath), "utf8");
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : entryPath;
  });
}

describe("built public shell", () => {
  it("renders the Sunlit Product Stage with graph content and the approved palette", () => {
    const indexPath = path.join(distRoot, "index.html");
    expect(existsSync(indexPath), "dist/index.html must exist after build").toBe(true);

    const html = readFileSync(indexPath, "utf8");
    const css = listFiles(path.join(distRoot, "_astro"))
      .filter((filePath) => filePath.endsWith(".css"))
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n");
    const styleClasses = read("src/styles/classes.ts");
    const stageSource = read("src/components/sunlit/SunlitProjectStage.astro");
    const proofMediaSource = read("src/components/sunlit/proof-media.ts");
    const proofImageSource = read("src/components/sunlit/SunlitProofImage.astro");
    const outcomes = getHomePageContent("en").selectedOutcomes;

    expect(html).toContain('<html lang="en"');
    expect(html).toContain('data-site-shell="public"');
    expect(html).toContain('href="/case-studies"');
    expect(html).toContain('href="/architecture"');
    expect(html).toContain('href="/resume"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain(">Work<");
    expect(html).toContain(">Services<");
    expect(html).toContain(">Architecture<");
    expect(html).toContain(">About<");
    expect(html).toContain(">Start a conversation<");
    expect(html).toContain('data-project-stage');
    expect(html).toContain('role="tablist"');
    expect(html).not.toContain('aria-orientation="vertical"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('data-stage-door="left"');
    expect(html).toContain('data-stage-door="right"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-busy="false"');
    expect(html.match(/<canvas/g)).toHaveLength(1);
    expect(outcomes).not.toHaveLength(0);
    for (const outcome of outcomes) {
      expect(html).toContain(`data-content-id="${outcome.contentId}"`);
      expect(html).toContain(`href="${outcome.path}"`);
    }
    expect(html).not.toMatch(/aohys-pixel|pixel-product-landscape|pixel-hills|pixel-lake/i);
    expect(html).not.toMatch(/>Solutions<|>Agents<|>Pricing<|>Docs<|>Blog</);
    expect(styleClasses).toContain("[--color-primary:oklch(0.8623_0.129_80)]");
    expect(styleClasses).toContain("[--color-secondary:oklch(0.7779_0.1104_121.8)]");
    expect(styleClasses).toContain("[--color-accent:oklch(0.8008_0.1283_55.5)]");
    expect(styleClasses).toContain("[--color-ink:oklch(0.3649_0.0215_61.4)]");
    expect(styleClasses).toContain("[--color-focus:oklch(0.3649_0.0215_61.4)]");
    expect(styleClasses).not.toMatch(/--color-(?:mint|sky|coral|lilac|aqua)/);
    expect(styleClasses).toContain("overflow-x-clip");
    expect(styleClasses).not.toContain("overflow-x-hidden");
    expect(css).toMatch(/Mona Sans Variable|Mona_Sans_Variable/);
    expect(css).toMatch(/Atkinson Hyperlegible Next Variable|Atkinson_Hyperlegible_Next_Variable/);
    expect(css).toContain("prefers-reduced-motion");
    expect(proofMediaSource).toContain("preferFull");
    expect(proofMediaSource).toContain("dashboardMedia?.thumbSrc");
    expect(proofMediaSource).toContain("staticMedia?.src");
    expect(proofMediaSource).toContain("evidenceSrc");
    expect(proofImageSource).toContain('candidate.addEventListener("error"');
    expect(proofImageSource).toContain("currentIndex + 1");
    expect(proofImageSource).toContain('candidate.dataset.fallbackExhausted = "true"');
    expect(stageSource).toContain("resolveProofMedia");
    expect(stageSource).toContain("SunlitProofImage");
    expect(stageSource).toContain("requestedIndex");
    expect(stageSource).toContain('new CustomEvent("sunlit:project-change"');
    expect(stageSource).toContain('data-active-tone="0"');
    expect(stageSource).toContain("stage.dataset.activeTone");
    expect(stageSource).toContain("object-fit: contain");
    expect(stageSource).toContain("grid-area: 1 / 1");
    expect(stageSource).not.toContain(".sunlit-project-panel { position: absolute");
    expect(stageSource).not.toContain(".sunlit-stage-scene { min-height: 34rem");
    expect(stageSource).toContain('figure[data-media-kind="site"]');
    expect(stageSource).toContain("sunlit-rail-hint");
    expect(stageSource).toContain("aria-selected");
    expect(stageSource).toContain("ArrowRight");
    expect(stageSource).toContain("Home");
    expect(stageSource).toContain("End");
    expect(stageSource).toContain('searchParams.get("project")');
    expect(stageSource).toContain('searchParams.set("project", contentId)');
    expect(stageSource).toContain('"pushState" : "replaceState"');
    expect(stageSource).toContain('window.addEventListener("popstate"');
    expect(stageSource).toContain('aria-orientation={hero ? undefined : "vertical"}');
  });
});
