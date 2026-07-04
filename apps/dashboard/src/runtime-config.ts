import type { DashboardRuntimeConfig } from "@/types";

const fallbackRuntimeConfig: DashboardRuntimeConfig = {
  adminEmail: "local@aohys.com",
  environment: "local",
  convexUrl: import.meta.env.VITE_CONVEX_URL ?? "http://127.0.0.1:3210",
  betterAuthUrl: import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4321",
  imagesAccountHash: import.meta.env.VITE_CLOUDFLARE_IMAGES_ACCOUNT_HASH || undefined,
};

export const dashboardRuntimeConfig = window.__AOHYS_DASHBOARD__ ?? fallbackRuntimeConfig;
