import { describe, expect, it } from "vitest";
import { publicationLabel, publicationStateCopy } from "./publication-state";

describe("publication state copy", () => {
  it("keeps every operational state literal and distinguishes retryability", () => {
    expect(Object.keys(publicationStateCopy)).toEqual([
      "published-locally",
      "release-requested",
      "release-acknowledged",
      "release-failed",
      "deployed",
      "rollback-needed",
    ]);
    expect(
      publicationLabel({
        requestKey: "a".repeat(64),
        scope: "all",
        targetEnvironment: "preview",
        state: "release-failed",
        retryable: true,
        updatedAt: 1,
      }),
    ).toBe("Release failed · retryable");
    expect(publicationStateCopy.deployed).toBe("Deployed · smoke verified");
  });
});
