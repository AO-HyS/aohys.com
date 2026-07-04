import { renderDashboardSignIn, renderDashboardState } from "@aohys/dashboard-ui";
import { validateEnvironmentContract, type EnvironmentName } from "@aohys/environment";
import { capturePostHogServerEvent } from "./posthog-server.js";
import { PRIVATE_HTML_HEADERS, PRIVATE_NO_STORE_HEADERS } from "./security-headers.js";

export interface DashboardAccessEnvironment extends Record<string, string | undefined> {
  AOHYS_ENV: EnvironmentName;
  PUBLIC_SITE_URL: string;
  CONVEX_URL: string;
  CONVEX_SITE_URL: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_TRUSTED_ORIGINS: string;
  ADMIN_EMAIL: string;
  PUBLIC_POSTHOG_KEY?: string;
  PUBLIC_POSTHOG_HOST?: string;
  CLOUDFLARE_IMAGES_ACCOUNT_HASH?: string;
}

type DashboardAccessEnvironmentInput =
  Partial<DashboardAccessEnvironment> &
  Record<string, string | undefined>;

export type DashboardFetch = typeof fetch;

export interface DashboardRuntimeExceptionEvent {
  event: "dashboard_runtime_exception";
  distinctId: string;
  properties: {
    environment: EnvironmentName;
    source: "cloudflare_pages_dashboard";
    path: string;
    errorType: string;
  };
}

export interface DashboardRuntimeErrorReporter {
  capture: (event: DashboardRuntimeExceptionEvent) => Promise<void> | void;
}

export interface DashboardAppShellConfig {
  adminEmail: string;
  environment: EnvironmentName;
  convexUrl: string;
  betterAuthUrl: string;
  imagesAccountHash?: string;
}

export async function safeHandleDashboardRequest(
  request: Request,
  environmentInput: DashboardAccessEnvironmentInput = {},
  fetchSession: DashboardFetch = fetch,
  reporter?: DashboardRuntimeErrorReporter,
): Promise<Response> {
  const environment = normalizeDashboardEnvironment(request, environmentInput);
  const runtimeReporter = reporter ?? createPostHogDashboardErrorReporter(environment);

  try {
    return await handleDashboardRequest(request, environment, fetchSession);
  } catch (error) {
    const url = new URL(request.url);

    await reportDashboardRuntimeError(
      runtimeReporter,
      {
        event: "dashboard_runtime_exception",
        distinctId: `dashboard:${environment.AOHYS_ENV}`,
        properties: {
          environment: environment.AOHYS_ENV,
          source: "cloudflare_pages_dashboard",
          path: normalizeDashboardPath(url.pathname),
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
      },
    );

    return htmlResponse(renderDashboardState("unavailable"), 502);
  }
}

export async function handleDashboardRequest(
  request: Request,
  environmentInput: DashboardAccessEnvironmentInput,
  fetchSession: DashboardFetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizeDashboardPath(url.pathname);
  const environment = normalizeDashboardEnvironment(request, environmentInput);

  if (path === "/dashboard/sign-out") {
    return signOutDashboard();
  }

  const contract = validateEnvironmentContract(environment.AOHYS_ENV, environment, {
    target: "dashboard-runtime",
  });

  if (!contract.ok) {
    return htmlResponse(renderDashboardState("configuration-error"), 503);
  }

  if (path === "/dashboard/sign-in/google") {
    return beginGoogleSignIn(request, environment, url.searchParams.get("callbackURL"), fetchSession);
  }

  if (path === "/dashboard/sign-in") {
    const callbackPath = normalizeCallbackPath(url.searchParams.get("callbackURL"));
    const signInUrl = new URL("/dashboard/sign-in/google", url.origin);
    signInUrl.searchParams.set("callbackURL", callbackPath);

    return htmlResponse(renderDashboardSignIn({
      signInUrl: `${signInUrl.pathname}${signInUrl.search}`,
    }));
  }

  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return redirectToSignIn(path);
  }

  const session = await readBetterAuthSession(environment, cookie, fetchSession);
  if (!session) {
    return redirectToSignIn(path);
  }

  const adminEmails = parseAdminEmails(environment.ADMIN_EMAIL);
  const sessionEmail = session.user.email.toLowerCase();

  if (!adminEmails.includes(sessionEmail)) {
    return htmlResponse(renderDashboardState("unauthorized"), 403);
  }

  return htmlResponse(renderDashboardAppShell({
    adminEmail: session.user.email,
    environment: environment.AOHYS_ENV,
    convexUrl: environment.CONVEX_URL,
    betterAuthUrl: environment.BETTER_AUTH_URL,
    imagesAccountHash: environment.CLOUDFLARE_IMAGES_ACCOUNT_HASH?.trim() || undefined,
  }));
}

function normalizeDashboardEnvironment(
  request: Request,
  environment: DashboardAccessEnvironmentInput | undefined,
): DashboardAccessEnvironment {
  const values = environment ?? {};

  return {
    ...values,
    AOHYS_ENV: normalizeEnvironmentName(values.AOHYS_ENV, request),
  } as DashboardAccessEnvironment;
}

function normalizeEnvironmentName(
  value: string | undefined,
  request: Request,
): EnvironmentName {
  if (value === "local" || value === "preview" || value === "production") {
    return value;
  }

  const hostname = new URL(request.url).hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "local";
  }

  if (hostname === "aohys.com" || hostname === "www.aohys.com") {
    return "production";
  }

  return "preview";
}

function createPostHogDashboardErrorReporter(
  environment: DashboardAccessEnvironment,
  reporterFetch: DashboardFetch = fetch,
): DashboardRuntimeErrorReporter {
  return {
    capture: async (event) => {
      await capturePostHogServerEvent(environment, {
        event: event.event,
        distinctId: event.distinctId,
        properties: event.properties,
      }, reporterFetch);
    },
  };
}

async function reportDashboardRuntimeError(
  reporter: DashboardRuntimeErrorReporter,
  event: DashboardRuntimeExceptionEvent,
): Promise<void> {
  try {
    await reporter.capture(event);
  } catch {
    // Error reporting is best-effort. The dashboard must still return a private response.
  }
}

async function beginGoogleSignIn(
  request: Request,
  environment: DashboardAccessEnvironment,
  callbackPath: string | null,
  authFetch: DashboardFetch,
): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const forwardedProto = incomingUrl.protocol.replace(":", "");
  const callbackUrl = new URL(normalizeCallbackPath(callbackPath), incomingUrl.origin);
  const response = await authFetch(
    `${environment.CONVEX_SITE_URL.replace(/\/$/, "")}/api/auth/sign-in/social`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-forwarded-host": incomingUrl.host,
        "x-forwarded-proto": forwardedProto,
        "x-better-auth-forwarded-host": incomingUrl.host,
        "x-better-auth-forwarded-proto": forwardedProto,
      },
      body: JSON.stringify({
        provider: "google",
        callbackURL: callbackUrl.toString(),
      }),
    },
  );

  if (!response.ok) {
    return htmlResponse(renderDashboardState("unavailable"), 502);
  }

  const location = response.headers.get("location") ?? await readRedirectUrl(response);

  if (!location) {
    return htmlResponse(renderDashboardState("unavailable"), 502);
  }

  const headers = new Headers(PRIVATE_NO_STORE_HEADERS);
  headers.set("location", location);
  const stateCookie = response.headers.get("set-cookie");

  if (stateCookie) {
    headers.set("set-cookie", stateCookie);
  }

  return new Response(null, {
    status: 302,
    headers,
  });
}

async function readRedirectUrl(response: Response): Promise<string | null> {
  try {
    const payload = await response.json() as { url?: string | null };
    return payload.url ?? null;
  } catch {
    return null;
  }
}

async function readBetterAuthSession(
  environment: DashboardAccessEnvironment,
  cookie: string,
  fetchSession: DashboardFetch,
): Promise<{ user: { email: string } } | null> {
  try {
    const response = await fetchSession(
      `${environment.CONVEX_SITE_URL.replace(/\/$/, "")}/api/auth/get-session`,
      {
        headers: {
          accept: "application/json",
          cookie,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as {
      user?: { email?: string | null } | null;
    };

    if (!payload.user?.email) {
      return null;
    }

    return { user: { email: payload.user.email } };
  } catch {
    return null;
  }
}

function redirectToSignIn(path: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      ...PRIVATE_NO_STORE_HEADERS,
      location: `/dashboard/sign-in?callbackURL=${encodeURIComponent(path)}`,
    },
  });
}

const DASHBOARD_AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.state",
  "__Secure-better-auth.state",
] as const;

function signOutDashboard(): Response {
  const headers = new Headers(PRIVATE_NO_STORE_HEADERS);
  headers.set("location", "/dashboard/sign-in");

  for (const cookieName of DASHBOARD_AUTH_COOKIE_NAMES) {
    headers.append("set-cookie", expireCookie(cookieName, cookieName.startsWith("__Secure-")));
  }

  return new Response(null, {
    status: 302,
    headers,
  });
}

function expireCookie(cookieName: string, secure: boolean): string {
  const secureDirective = secure ? "; Secure" : "";
  return `${cookieName}=; Path=/; Max-Age=0; HttpOnly${secureDirective}; SameSite=Lax`;
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: PRIVATE_HTML_HEADERS,
  });
}

function renderDashboardAppShell(config: DashboardAppShellConfig): string {
  const serializedConfig = JSON.stringify(config).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>AOHYS Dashboard</title>
    <link rel="stylesheet" href="/dashboard-app/assets/dashboard.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>window.__AOHYS_DASHBOARD__ = ${serializedConfig};</script>
    <script type="module" src="/dashboard-app/assets/dashboard.js"></script>
  </body>
</html>`;
}

function normalizeDashboardPath(pathname: string): string {
  const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return normalized || "/dashboard";
}

function normalizeCallbackPath(path: string | null): string {
  if (!path || !path.startsWith("/dashboard") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

function parseAdminEmails(value: string): string[] {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
