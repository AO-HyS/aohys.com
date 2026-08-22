import { describe, expect, it } from "vitest";
import {
  formatLeadIntent,
  formatLeadStatus,
  leadStatusTone,
} from "./leads-view-model";

describe("lead journey view model", () => {
  it("keeps follow-up state readable without relying on color", () => {
    expect(formatLeadStatus("new")).toBe("New");
    expect(formatLeadStatus("reviewing")).toBe("Reviewing");
    expect(formatLeadStatus("closed")).toBe("Closed");
    expect(leadStatusTone("closed")).toBe("success");
  });

  it("turns the stored intent key into visible copy", () => {
    expect(formatLeadIntent("product-consulting")).toBe("Product Consulting");
  });
});
