import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CONVEX_INDEX_NAME_LIMIT = 64;
const schemaPath = fileURLToPath(
  new URL("../convex/schema.ts", import.meta.url),
);

describe("Convex schema index names", () => {
  it("keeps every literal index name within the Convex limit", () => {
    const schemaSource = readFileSync(schemaPath, "utf8");
    const indexNames = Array.from(
      schemaSource.matchAll(/\.index\(\s*["']([^"']+)["']/g),
    ).flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
    const invalidIndexNames = indexNames.filter(
      (name) => name.length > CONVEX_INDEX_NAME_LIMIT,
    );

    expect(indexNames.length).toBeGreaterThan(0);
    expect(invalidIndexNames).toEqual([]);
  });
});
