import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://aohys.com",
  output: "static",
  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
