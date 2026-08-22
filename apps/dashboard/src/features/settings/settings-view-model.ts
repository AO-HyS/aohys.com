import { validatePublicWhatsappUrl } from "@aohys/core";

export function getPublicWhatsappSettingViewModel(
  value: string,
  initialValue: string,
) {
  const validation = validatePublicWhatsappUrl(value);
  const isDirty = value.trim() !== initialValue;
  return { validation, isDirty, canSave: isDirty && validation.ok };
}
