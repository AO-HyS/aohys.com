export interface PublicWhatsappUrlValidation {
  ok: boolean;
  normalized?: string;
  reason?: string;
}

export function validatePublicWhatsappUrl(input: string): PublicWhatsappUrlValidation {
  const value = input.trim();

  if (!value) return { ok: false, reason: "Enter the public WhatsApp URL." };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "Enter a valid absolute URL." };
  }

  if (
    url.protocol !== "https:" || url.hostname !== "wa.me" || url.port ||
    url.username || url.password || url.search || url.hash
  ) {
    return { ok: false, reason: "Use a direct https://wa.me/number URL without query parameters." };
  }

  const phone = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!/^\d{8,15}$/.test(phone)) {
    return { ok: false, reason: "Use 8 to 15 digits, including the country code, with no spaces or symbols." };
  }

  return { ok: true, normalized: `https://wa.me/${phone}` };
}

export function normalizePublicWhatsappUrl(input: string): string | undefined {
  return validatePublicWhatsappUrl(input).normalized;
}
