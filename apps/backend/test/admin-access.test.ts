import { describe, expect, it } from "vitest";
import { parseAdminEmails } from "../convex/auth.js";

describe("admin email allowlist parsing", () => {
  it("splits, trims, and lowercases comma-separated emails", () => {
    expect(parseAdminEmails(" A.Ortizcrr@Gmail.com , alejandro.ortiz@aohys.com ")).toEqual([
      "a.ortizcrr@gmail.com",
      "alejandro.ortiz@aohys.com",
    ]);
  });

  it("drops empty entries", () => {
    expect(parseAdminEmails(",alejandro.ortiz@aohys.com,, ,")).toEqual([
      "alejandro.ortiz@aohys.com",
    ]);
  });

  it("returns an empty allowlist when the value is missing or blank", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("  ,  ")).toEqual([]);
  });
});
