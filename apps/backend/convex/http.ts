import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { authComponent, createAuth } from "./auth.js";
import {
  captureLeadAnalyticsWithPostHog,
  sendLeadNotificationWithResend,
} from "../src/contact-providers.js";
import {
  buildContactIntakeTelemetryEvent,
  buildPublicContactError,
  parseContactInput,
} from "../src/contact-http.js";
import {
  submitContactLead,
  type ContactLeadInput,
  type PreparedContactLead,
} from "../src/contact-workflow.js";
import {
  resolveContactEnvironment,
  shouldCaptureContactIntakeFailure,
} from "../src/contact-environment.js";
import { type Environment } from "@aohys/core/domain";
import { getVariableNamesForDestination } from "@aohys/environment";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  basePath: "/api/auth",
  cors: true,
  trustedOrigins: () =>
    (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
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
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

function getContactEnvironmentValues(): Record<string, string | undefined> {
  return Object.fromEntries(
    getVariableNamesForDestination("convex-runtime").map((name) => [
      name,
      process.env[name],
    ]),
  );
}

function getContactEnvironment(): Environment {
  return resolveContactEnvironment(process.env.AOHYS_ENV);
}

async function captureContactIntakeFailure(
  input: Partial<ContactLeadInput> | undefined,
  publicError: ReturnType<typeof buildPublicContactError>,
  error: unknown,
): Promise<void> {
  const apiKey = process.env.PUBLIC_POSTHOG_KEY?.trim();
  const environment = getContactEnvironment();

  if (!apiKey || !shouldCaptureContactIntakeFailure(environment, apiKey)) {
    return;
  }

  try {
    await captureLeadAnalyticsWithPostHog(
      buildContactIntakeTelemetryEvent({
        environment,
        ...(input ? { input } : {}),
        publicError,
        error,
        ...(process.env.PUBLIC_RELEASE_SHA
          ? { releaseSha: process.env.PUBLIC_RELEASE_SHA }
          : {}),
      }),
      {
        apiKey,
        host: "https://aohys.com/ingest",
      },
    );
  } catch {
    // Intake failure telemetry is best-effort and must not change the public response.
  }
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
    } catch (error) {
      const publicError = buildPublicContactError(
        new Error("Invalid contact payload."),
      );
      await captureContactIntakeFailure(undefined, publicError, error);

      return jsonResponse(publicError.body, { status: publicError.status });
    }

    try {
      const result = await submitContactLead(input, {
        environment: getContactEnvironment(),
        values: getContactEnvironmentValues(),
        adapters: {
          persistLead: async (lead: PreparedContactLead) =>
            ctx.runMutation(internal.leads.createFromContact, lead),
          sendNotification: async (notification) =>
            sendLeadNotificationWithResend(notification, {
              apiKey: process.env.RESEND_API_KEY ?? "",
            }),
          captureAnalyticsEvent: async (event) =>
            captureLeadAnalyticsWithPostHog(event, {
              apiKey: process.env.PUBLIC_POSTHOG_KEY ?? "",
              host: "https://aohys.com/ingest",
            }),
        },
      });

      return jsonResponse({ ok: true, ...result });
    } catch (error) {
      const publicError = buildPublicContactError(error);
      await captureContactIntakeFailure(input, publicError, error);

      return jsonResponse(publicError.body, { status: publicError.status });
    }
  }),
});

export default http;
