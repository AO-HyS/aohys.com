import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const siteRoot = process.cwd();

function read(relativePath: string) {
  const absolutePath = path.join(siteRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} is missing`).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("public site source quality", () => {
  it("keeps design tokens, fonts, and graph-backed routing wired", () => {
    const globalCss = read("src/styles/global.css");
    const home = read("src/pages/index.astro");
    const routePage = read("src/pages/[...path].astro");
    const layout = read("src/layouts/BaseLayout.astro");
    const header = read("src/components/SiteHeader.astro");
    const footer = read("src/components/SiteFooter.astro");
    const publicContentPage = read("src/components/PublicContentPage.astro");
    const enDictionary = read("src/i18n/en.json");
    const esDictionary = read("src/i18n/es.json");
    const source = [
      globalCss,
      home,
      routePage,
      layout,
      header,
      footer,
      publicContentPage,
      enDictionary,
      esDictionary,
    ].join("\n");

    expect(globalCss).toContain("@fontsource-variable/mona-sans");
    expect(globalCss).toContain("@fontsource-variable/atkinson-hyperlegible-next");
    expect(globalCss).toContain("--color-primary: oklch(");
    expect(globalCss).toContain("--color-mint: oklch(");
    expect(globalCss).toContain("--text-hero:");
    expect(globalCss).toContain("prefers-reduced-motion");
    expect(layout).toContain('data-site-shell="public"');
    expect(header).toContain("getLocalizedPath");
    expect(header).toContain("getUiCopy");
    expect(footer).toContain("getUiCopy");
    expect(publicContentPage).toContain("getUiCopy");
    expect(enDictionary).toContain("client and product code stays private");
    expect(esDictionary).toContain("Los límites público/privado");
    expect(routePage).toContain("getPublicRouteMap");
    expect(layout).toContain('rel="alternate"');
    expect(source).not.toMatch(/background-clip:\s*text/i);
    expect(source).not.toMatch(/repeating-linear-gradient/i);
    expect(source).not.toMatch(/border-radius:\s*(3[2-9]|[4-9][0-9])px/i);
    expect(globalCss).not.toMatch(/font-size:\s*clamp\([^;]*vw/i);
    expect(globalCss).not.toMatch(/--text-[^:]+:\s*clamp\([^;]*vw/i);
    expect(source).not.toMatch(/lorem/i);
  });
});
