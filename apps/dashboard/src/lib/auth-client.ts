import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { AuthClient } from "@convex-dev/better-auth/react";
import { createAuthClient } from "better-auth/react";
import { dashboardRuntimeConfig } from "@/runtime-config";

const authClientCandidate: unknown = createAuthClient({
  baseURL: dashboardRuntimeConfig.betterAuthUrl,
  plugins: [convexClient()],
});

function isAuthClient(value: unknown): value is AuthClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "$fetch" in value &&
    typeof value.$fetch === "function" &&
    "$store" in value &&
    typeof value.$store === "object" &&
    "useSession" in value &&
    typeof value.useSession === "function"
  );
}

if (!isAuthClient(authClientCandidate)) {
  throw new Error("Better Auth client has an invalid runtime shape.");
}

export const authClient = authClientCandidate;
