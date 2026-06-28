import { describe, expect, it } from "vitest";
import { assertOneOf, escapeHtml, trimToUndefined } from "../src/index.js";

describe("shared primitives", () => {
  it("normalizes optional string input without preserving blank values", () => {
    expect(trimToUndefined("  AOHYS  ")).toBe("AOHYS");
    expect(trimToUndefined("   ")).toBeUndefined();
    expect(trimToUndefined(undefined)).toBeUndefined();
  });

  it("asserts that a string belongs to a readonly literal list", () => {
    const allowed = ["project", "hiring"] as const;
    let value = "project";

    assertOneOf(value, allowed, "intent");
    expect(value).toBe("project");

    value = "unsupported";
    expect(() => assertOneOf(value, allowed, "intent")).toThrow(
      "intent is not supported.",
    );
  });

  it("escapes text before embedding it in HTML strings", () => {
    expect(escapeHtml('<script>alert("x")</script> & copy')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; copy",
    );
  });
});
