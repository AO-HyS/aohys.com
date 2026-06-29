import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { authComponent, createAuth } from "./auth.js";
import {
  captureLeadAnalyticsWithPostHog,
  sendLeadNotificationWithResend,
} from "../src/contact-providers.js";
import {
  submitContactLead,
  type ContactLeadInput,
  type PreparedContactLead,
} from "../src/contact-workflow.js";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  basePath: "/api/auth",
  cors: true,
  trustedOrigins: () => (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(
  body: Record<string, unknown>,
  init: ResponseInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

function getContactEnvironmentValues(): Record<string, string | undefined> {
  return {
    AOHYS_ENV: process.env.AOHYS_ENV,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
    PUBLIC_CONTACT_ENDPOINT: process.env.PUBLIC_CONTACT_ENDPOINT,
    CONVEX_URL: process.env.CONVEX_URL,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
    CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY,
    PUBLIC_POSTHOG_KEY: process.env.PUBLIC_POSTHOG_KEY,
    PUBLIC_POSTHOG_HOST: process.env.PUBLIC_POSTHOG_HOST,
    PUBLIC_POSTHOG_AUTOCAPTURE: process.env.PUBLIC_POSTHOG_AUTOCAPTURE,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    LEAD_NOTIFICATION_EMAIL: process.env.LEAD_NOTIFICATION_EMAIL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_PROJECT_NAME: process.env.CLOUDFLARE_PROJECT_NAME,
    CLOUDFLARE_IMAGES_ACCOUNT_HASH: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH,
    PUBLIC_CONTACT_EMAIL: process.env.PUBLIC_CONTACT_EMAIL,
    PUBLIC_WHATSAPP_URL: process.env.PUBLIC_WHATSAPP_URL,
  };
}

async function parseContactInput(request: Request): Promise<ContactLeadInput> {
  const payload = await request.json() as ContactLeadInput;

  return payload;
}

http.route({
  path: "/contact",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/contact",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let input: ContactLeadInput;

    try {
      input = await parseContactInput(request);
    } catch {
      return jsonResponse({ ok: false, error: "Invalid contact payload." }, { status: 400 });
    }

    try {
      const result = await submitContactLead(input, {
        environment: (process.env.AOHYS_ENV ?? "production") as "local" | "preview" | "production",
        values: getContactEnvironmentValues(),
        adapters: {
          persistLead: async (lead: PreparedContactLead) => ctx.runMutation(
            internal.leads.createFromContact,
            lead,
          ),
          sendNotification: async (notification) => sendLeadNotificationWithResend(
            notification,
            { apiKey: process.env.RESEND_API_KEY ?? "" },
          ),
          captureAnalyticsEvent: async (event) => captureLeadAnalyticsWithPostHog(
            event,
            {
              apiKey: process.env.PUBLIC_POSTHOG_KEY ?? "",
              host: process.env.PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
            },
          ),
        },
      });

      return jsonResponse({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Contact submission failed.";
      const status = message.startsWith("Contact providers are not configured") ? 503 : 400;

      return jsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

export default http;
