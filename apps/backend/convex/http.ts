import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { authComponent, createAuth } from "./auth.js";
import {
  captureLeadAnalyticsWithPostHog,
  sendLeadNotificationWithResend,
} from "../src/contact-providers.js";
import { buildPublicContactError } from "../src/contact-http.js";
import {
  submitContactLead,
  type ContactLeadInput,
  type PreparedContactLead,
} from "../src/contact-workflow.js";
import {
  assertDashboardApiToken,
  parseDashboardLeadStatusPayload,
} from "../src/dashboard-leads.js";
import {
  parseDashboardCaseStudyMetadataPayload,
  parseDashboardMediaMetadataPayload,
  parseDashboardResumeVersionPayload,
  parseDashboardSiteSettingPayload,
} from "../src/dashboard-content.js";

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

const privateJsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
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

function privateJsonResponse(
  body: Record<string, unknown> | Record<string, unknown>[],
  init: ResponseInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...privateJsonHeaders,
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
    DASHBOARD_API_TOKEN: process.env.DASHBOARD_API_TOKEN,
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
  path: "/dashboard/leads",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      assertDashboardApiToken(request, process.env.DASHBOARD_API_TOKEN);
      const leads = await ctx.runQuery(internal.leads.listForDashboard);

      return privateJsonResponse({ leads });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard leads are unavailable.";
      const status = message.includes("token") ? 401 : 503;

      return privateJsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

http.route({
  path: "/dashboard/leads/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertDashboardApiToken(request, process.env.DASHBOARD_API_TOKEN);
      const payload = await parseDashboardLeadStatusPayload(request);
      const result = await ctx.runMutation(internal.leads.updateStatusFromDashboard, {
        leadId: payload.leadId as Id<"leads">,
        status: payload.status,
      });

      return privateJsonResponse({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lead status could not be updated.";
      const status = message.includes("token") ? 401 : 400;

      return privateJsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

http.route({
  path: "/dashboard/content",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      assertDashboardApiToken(request, process.env.DASHBOARD_API_TOKEN);
      const content = await ctx.runQuery(internal.content.listForDashboard);

      return privateJsonResponse(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard content is unavailable.";
      const status = message.includes("token") ? 401 : 503;

      return privateJsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

http.route({
  path: "/dashboard/content/case-study",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertDashboardApiToken(request, process.env.DASHBOARD_API_TOKEN);
      const payload = await parseDashboardCaseStudyMetadataPayload(request);
      const result = await ctx.runMutation(
        internal.content.upsertCaseStudyMetadataFromDashboard,
        payload,
      );

      return privateJsonResponse({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Case-study metadata could not be saved.";
      const status = message.includes("token") ? 401 : 400;

      return privateJsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

http.route({
  path: "/dashboard/content/media",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertDashboardApiToken(request, process.env.DASHBOARD_API_TOKEN);
      const payload = await parseDashboardMediaMetadataPayload(request);
      const result = await ctx.runMutation(
        internal.content.createMediaMetadataFromDashboard,
        payload,
      );

      return privateJsonResponse({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Media metadata could not be saved.";
      const status = message.includes("token") ? 401 : 400;

      return privateJsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

http.route({
  path: "/dashboard/content/setting",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertDashboardApiToken(request, process.env.DASHBOARD_API_TOKEN);
      const payload = await parseDashboardSiteSettingPayload(request);
      const result = await ctx.runMutation(
        internal.content.upsertSiteSettingFromDashboard,
        payload,
      );

      return privateJsonResponse({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Site setting could not be saved.";
      const status = message.includes("token") ? 401 : 400;

      return privateJsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

http.route({
  path: "/dashboard/content/resume",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertDashboardApiToken(request, process.env.DASHBOARD_API_TOKEN);
      const payload = await parseDashboardResumeVersionPayload(request);
      const result = await ctx.runMutation(
        internal.content.createResumeVersionFromDashboard,
        payload,
      );

      return privateJsonResponse({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume version could not be saved.";
      const status = message.includes("token") ? 401 : 400;

      return privateJsonResponse({ ok: false, error: message }, { status });
    }
  }),
});

http.route({
  path: "/contact",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let input: ContactLeadInput;

    try {
      input = await parseContactInput(request);
    } catch {
      const publicError = buildPublicContactError(new Error("Invalid contact payload."));

      return jsonResponse(publicError.body, { status: publicError.status });
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
      const publicError = buildPublicContactError(error);

      return jsonResponse(publicError.body, { status: publicError.status });
    }
  }),
});

export default http;
