// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadsScreen } from "./leads-screen";
import type { DashboardLead } from "./leads-types";

const lead: DashboardLead = {
  id: "lead-1" as Id<"leads">,
  name: "Ada Lovelace",
  email: "ada@example.com",
  preferredContactPath: "email",
  intent: "project",
  message: "I would like to discuss a project.",
  sourcePath: "/contact",
  locale: "en",
  status: "new",
  createdAt: 1,
  updatedAt: 1,
};

const mocks = vi.hoisted(() => ({
  saveLeadStatus: vi.fn(),
}));

vi.mock("./leads-api", () => ({
  useDashboardLeads: () => ({
    results: [lead],
    status: "Exhausted",
    loadMore: vi.fn(),
  }),
  useSaveLeadStatus: () => mocks.saveLeadStatus,
}));
vi.mock("@/components/ui/toast", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/lib/analytics", () => ({ captureDashboardAction: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LeadsScreen journey", () => {
  it("changes and saves follow-up status with an accessible pending state", async () => {
    let finishSave: (() => void) | undefined;
    mocks.saveLeadStatus.mockImplementation(
      () => new Promise<void>((resolve) => (finishSave = resolve)),
    );
    const user = userEvent.setup();
    render(<LeadsScreen />);

    expect(screen.getByRole("heading", { name: "Lead inbox" })).toBeTruthy();
    await user.click(screen.getByLabelText("Follow-up status"));
    await user.click(screen.getByRole("option", { name: "Reviewing" }));
    fireEvent.click(screen.getByRole("button", { name: "Save status" }));

    expect(mocks.saveLeadStatus).toHaveBeenCalledWith("lead-1", "reviewing");
    const pending = await screen.findByRole("button", { name: /Saving…/ });
    expect(pending.getAttribute("aria-busy")).toBe("true");
    expect((pending as HTMLButtonElement).disabled).toBe(true);

    finishSave?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save status" })).toBeTruthy(),
    );
  });
});
