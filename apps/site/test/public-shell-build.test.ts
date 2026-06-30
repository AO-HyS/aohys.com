import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const siteRoot = process.cwd();
const distRoot = path.join(siteRoot, "dist");

function read(relativePath: string) {
  return readFileSync(path.join(siteRoot, relativePath), "utf8");
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : entryPath;
  });
}

describe("built public shell", () => {
  it("renders the home shell with SEO copy and approved visual tokens", () => {
    const indexPath = path.join(distRoot, "index.html");
    expect(existsSync(indexPath), "dist/index.html must exist after build").toBe(true);

    const html = readFileSync(indexPath, "utf8");
    const css = listFiles(path.join(distRoot, "_astro"))
      .filter((filePath) => filePath.endsWith(".css"))
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n");
    const sourceCss = read("src/styles/global.css");

    expect(html).toContain('<html lang="en"');
    expect(html).toMatch(/<title>(Alejandro Ortiz Corro|AOHYS)/);
    expect(html).toContain('name="description"');
    expect(html).toContain("reliable product systems");
    expect(html).toContain("software architecture");
    expect(html).toContain('data-site-shell="public"');
    expect(html).toContain('href="/case-studies"');
    expect(html).toContain('href="/architecture"');
    expect(html).toContain('href="/resume"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Start a conversation");
    expect(html).toContain("View selected work");
    expect(html).toContain("/images/brand/aohys-logo.png");
    expect(html).toContain("Public sample, private client work.");
    expect(html).toContain("client and product code stays private");
    expect(html).not.toContain("Download ATS PDF");
    expect(html).not.toMatch(/lorem|todo|placeholder/i);
    expect(css).toContain("--color-primary");
    expect(css).toContain("--color-mint");
    expect(css).toContain("--font-display");
    expect(css).toContain("--font-body");
    expect(css).toContain("prefers-reduced-motion");
    expect(sourceCss).toContain("oklch(");
    expect(sourceCss).toMatch(/@fontsource-variable\/mona-sans|Mona Sans/);
    expect(sourceCss).toMatch(/@fontsource-variable\/atkinson-hyperlegible-next|Atkinson Hyperlegible Next/);
  });
});
