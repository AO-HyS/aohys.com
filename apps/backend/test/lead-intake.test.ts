import { describe, expect, it } from "vitest";
import { prepareLeadIntake } from "../src/lead-intake.js";

describe("lead intake boundary", () => {
  it("normalizes a valid public lead payload without database coupling", () => {
    const prepared = prepareLeadIntake(
      {
        name: "  Alejandro Ortiz  ",
        email: "  ALEJANDRO.ORTIZ@AOHYS.COM ",
        company: " AOHYS ",
        intent: "project",
        message: " I need a bilingual product site with a private dashboard. ",
        sourcePath: "/contact",
        locale: "en",
        referrer: "https://aohys.com/resume",
      },
      { now: 1_788_000_000_000 },
    );

    expect(prepared).toEqual({
      name: "Alejandro Ortiz",
      email: "alejandro.ortiz@aohys.com",
      company: "AOHYS",
      intent: "project",
      message: "I need a bilingual product site with a private dashboard.",
      sourcePath: "/contact",
      locale: "en",
      referrer: "https://aohys.com/resume",
      status: "new",
      createdAt: 1_788_000_000_000,
      updatedAt: 1_788_000_000_000,
    });
  });
});
