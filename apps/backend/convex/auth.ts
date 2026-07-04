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
    baseURL: createBetterAuthBaseUrl(authBaseUrl, siteUrl, process.env.AOHYS_ENV),
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
      trustedProxyHeaders: true,
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

export function parseAdminEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(ctx: GenericCtx<DataModel>) {
  const user = await authComponent.safeGetAuthUser(ctx);

  if (!user) {
    throw new Error("Authentication is required for dashboard access.");
  }

  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAIL);

  if (adminEmails.length === 0 || !adminEmails.includes(user.email.toLowerCase())) {
    throw new Error("This account is not allowed to use the dashboard.");
  }

  return user;
}

export function createBetterAuthBaseUrl(
  authBaseUrl: string,
  siteUrl: string,
  environment: string | undefined,
): BetterAuthOptions["baseURL"] {
  if (environment !== "preview" && environment !== "local") {
    return authBaseUrl;
  }

  return {
    allowedHosts: uniqueStrings([
      hostnameFromUrl(authBaseUrl),
      hostnameFromUrl(siteUrl),
      "localhost",
      "127.0.0.1",
      "*.aohys-com.pages.dev",
    ].filter(isDefinedString)),
    fallback: authBaseUrl,
    protocol: "auto",
  };
}

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

function hostnameFromUrl(value: string): string | undefined {
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isDefinedString(value: string | undefined): value is string {
  return typeof value === "string";
}
