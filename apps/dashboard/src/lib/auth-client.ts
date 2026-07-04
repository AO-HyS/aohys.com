import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { AuthClient } from "@convex-dev/better-auth/react";
import { createAuthClient } from "better-auth/react";
import { dashboardRuntimeConfig } from "@/runtime-config";

export const authClient = createAuthClient({
  baseURL: dashboardRuntimeConfig.betterAuthUrl,
  plugins: [convexClient()],
}) as unknown as AuthClient;
