import { describe, expect, it } from "vitest";
import { getPublicWhatsappSettingViewModel } from "./settings-view-model";

describe("settings journey view model", () => {
  it("enables save only for a changed, normalized public WhatsApp URL", () => {
    expect(
      getPublicWhatsappSettingViewModel("https://wa.me/522299020825", ""),
    ).toMatchObject({
      isDirty: true,
      canSave: true,
      validation: { normalized: "https://wa.me/522299020825" },
    });
    expect(
      getPublicWhatsappSettingViewModel("javascript:alert(1)", ""),
    ).toMatchObject({
      isDirty: true,
      canSave: false,
    });
  });
});
