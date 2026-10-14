import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { LOCALES } from "@aohys/core/domain";

export default defineConfig({
  site: "https://aohys.com",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    locales: [...LOCALES],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
