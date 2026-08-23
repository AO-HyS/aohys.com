// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./settings-screen";

const mocks = vi.hoisted(() => ({
  saveSiteSetting: vi.fn(),
}));

vi.mock("./settings-api", () => ({
  useSettingsContent: () => [
    {
      key: "PUBLIC_WHATSAPP_URL",
      value: "https://wa.me/522299020825",
      updatedAt: 1,
    },
  ],
  useSaveSiteSetting: () => mocks.saveSiteSetting,
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

describe("SettingsScreen journey", () => {
  it("saves the exact normalized public setting with accessible dirty and pending states", async () => {
    let finishSave: (() => void) | undefined;
    mocks.saveSiteSetting.mockImplementation(
      () => new Promise<void>((resolve) => (finishSave = resolve)),
    );
    render(<SettingsScreen />);

    expect(screen.getByRole("heading", { name: "Site settings" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("WhatsApp public URL"), {
      target: { value: "https://wa.me/521234567890" },
    });
    expect(screen.getByText("Unsaved change")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save setting" }));

    expect(mocks.saveSiteSetting).toHaveBeenCalledWith({
      key: "PUBLIC_WHATSAPP_URL",
      value: "https://wa.me/521234567890",
      classification: "public-build-value",
    });
    const pending = await screen.findByRole("button", { name: /Saving…/ });
    expect(pending.getAttribute("aria-busy")).toBe("true");
    expect((pending as HTMLButtonElement).disabled).toBe(true);

    finishSave?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save setting" })).toBeTruthy(),
    );
  });
});
