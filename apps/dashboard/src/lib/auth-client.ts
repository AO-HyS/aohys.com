import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { AuthClient } from "@convex-dev/better-auth/react";
import { createAuthClient } from "better-auth/react";
import { dashboardRuntimeConfig } from "@/runtime-config";

const authClientCandidate: unknown = createAuthClient({
  baseURL: dashboardRuntimeConfig.betterAuthUrl,
  plugins: [convexClient()],
});

export function isAuthClient(value: unknown): value is AuthClient {
  if (
    (typeof value !== "object" && typeof value !== "function") ||
    value === null
  ) {
    return false;
  }
  return (
    typeof Reflect.get(value, "$fetch") === "function" &&
    typeof Reflect.get(value, "$store") === "function" &&
    typeof Reflect.get(value, "useSession") === "function"
  );
}

if (!isAuthClient(authClientCandidate)) {
  throw new Error("Better Auth client has an invalid runtime shape.");
}

export const authClient = authClientCandidate;
