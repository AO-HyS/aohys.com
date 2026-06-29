import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { components } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";
import { query } from "./_generated/server.js";
import authConfig from "./auth.config.js";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = requireEnvironmentValue("PUBLIC_SITE_URL");
  const authBaseUrl = requireEnvironmentValue("BETTER_AUTH_URL");

  return betterAuth({
    appName: "AOHYS",
    baseURL: authBaseUrl,
    secret: requireEnvironmentValue("BETTER_AUTH_SECRET"),
    trustedOrigins: parseTrustedOrigins(),
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: {
        clientId: requireEnvironmentValue("GOOGLE_CLIENT_ID"),
        clientSecret: requireEnvironmentValue("GOOGLE_CLIENT_SECRET"),
      },
    },
    rateLimit: {
      storage: "database",
    },
    advanced: {
      useSecureCookies: siteUrl.startsWith("https://"),
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions);
};

export const { getAuthUser } = authComponent.clientApi();

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => authComponent.safeGetAuthUser(ctx),
});

function parseTrustedOrigins(): string[] {
  return (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function requireEnvironmentValue(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Better Auth.`);
  }

  return value;
}
