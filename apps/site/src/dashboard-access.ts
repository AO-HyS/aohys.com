import {
  renderDashboardShell,
  renderDashboardSignIn,
  renderDashboardState,
} from "@aohys/dashboard-ui";
import { validateEnvironmentContract, type EnvironmentName } from "@aohys/environment";

export interface DashboardAccessEnvironment extends Record<string, string | undefined> {
  AOHYS_ENV: EnvironmentName;
  PUBLIC_SITE_URL: string;
  CONVEX_SITE_URL: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_TRUSTED_ORIGINS: string;
  ADMIN_EMAIL: string;
}

export type DashboardFetch = typeof fetch;

const PRIVATE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
  "cache-control": "no-store",
} as const;

export async function handleDashboardRequest(
  request: Request,
  environment: DashboardAccessEnvironment,
  fetchSession: DashboardFetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizeDashboardPath(url.pathname);
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

  return htmlResponse(renderDashboardShell({
    adminEmail: session.user.email,
    activePath: path,
    title: titleForPath(path),
  }));
}

async function beginGoogleSignIn(
  request: Request,
  environment: DashboardAccessEnvironment,
  callbackPath: string | null,
  authFetch: DashboardFetch,
): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const forwardedProto = incomingUrl.protocol.replace(":", "");
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
        callbackURL: normalizeCallbackPath(callbackPath),
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

  const headers = new Headers({
    location,
    "x-robots-tag": "noindex, nofollow",
    "cache-control": "no-store",
  });
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
}

function redirectToSignIn(path: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location: `/dashboard/sign-in?callbackURL=${encodeURIComponent(path)}`,
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "no-store",
    },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: PRIVATE_HEADERS,
  });
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

function titleForPath(path: string): string {
  switch (path) {
    case "/dashboard/leads":
      return "Leads";
    case "/dashboard/case-studies":
      return "Case studies";
    case "/dashboard/media":
      return "Media";
    case "/dashboard/settings":
      return "Settings";
    default:
      return "Operations overview";
  }
}

function parseAdminEmails(value: string): string[] {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
