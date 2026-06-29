import {
  renderDashboardLeadWorkflow,
  renderDashboardShell,
  renderDashboardSignIn,
  renderDashboardState,
  DASHBOARD_LEAD_STATUSES,
  type DashboardLead,
  type DashboardLeadStatus,
  type DashboardLeadWorkflowState,
} from "@aohys/dashboard-ui";
import { isOneOf } from "@aohys/core";
import { validateEnvironmentContract, type EnvironmentName } from "@aohys/environment";

export interface DashboardAccessEnvironment extends Record<string, string | undefined> {
  AOHYS_ENV: EnvironmentName;
  PUBLIC_SITE_URL: string;
  CONVEX_SITE_URL: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_TRUSTED_ORIGINS: string;
  ADMIN_EMAIL: string;
  DASHBOARD_API_TOKEN: string;
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

  if (path === "/dashboard/leads/status" && request.method === "POST") {
    return updateDashboardLeadStatus(request, environment, fetchSession);
  }

  if (path === "/dashboard/leads/status") {
    return new Response(null, {
      status: 405,
      headers: {
        allow: "POST",
        "x-robots-tag": "noindex, nofollow",
        "cache-control": "no-store",
      },
    });
  }

  if (path === "/dashboard/leads") {
    return renderDashboardLeads(request, environment, session.user.email, fetchSession);
  }

  return htmlResponse(renderDashboardShell({
    adminEmail: session.user.email,
    activePath: path,
    title: titleForPath(path),
  }));
}

async function renderDashboardLeads(
  request: Request,
  environment: DashboardAccessEnvironment,
  adminEmail: string,
  dashboardFetch: DashboardFetch,
  workflowState?: DashboardLeadWorkflowState,
  validationMessage?: string,
): Promise<Response> {
  const url = new URL(request.url);
  const leadResult = await readDashboardLeads(environment, dashboardFetch);

  if (!leadResult.ok) {
    return htmlResponse(renderDashboardLeadWorkflow({
      adminEmail,
      activePath: "/dashboard/leads",
      title: "Leads",
      leads: [],
      workflowState: "configuration-error",
      validationMessage: leadResult.error,
    }), 502);
  }

  return htmlResponse(renderDashboardLeadWorkflow({
    adminEmail,
    activePath: "/dashboard/leads",
    title: "Leads",
    leads: leadResult.leads,
    selectedLeadId: url.searchParams.get("lead") ?? undefined,
    workflowState: workflowState ?? (url.searchParams.get("saved") === "1" ? "save-success" : undefined),
    validationMessage,
  }));
}

async function updateDashboardLeadStatus(
  request: Request,
  environment: DashboardAccessEnvironment,
  dashboardFetch: DashboardFetch,
): Promise<Response> {
  const formData = await request.formData();
  const leadId = valueFromFormData(formData.get("leadId"));
  const status = valueFromFormData(formData.get("status"));
  const cookie = request.headers.get("cookie") ?? "";
  const session = await readBetterAuthSession(environment, cookie, dashboardFetch);

  if (!session) {
    return redirectToSignIn("/dashboard/leads");
  }

  if (!leadId || !isDashboardLeadStatus(status)) {
    return renderDashboardLeads(
      request,
      environment,
      session.user.email,
      dashboardFetch,
      "validation-error",
      "Choose a valid lead status before saving.",
    );
  }

  const response = await dashboardFetch(
    `${environment.CONVEX_SITE_URL.replace(/\/$/, "")}/dashboard/leads/status`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${environment.DASHBOARD_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ leadId, status }),
    },
  );

  if (!response.ok) {
    return renderDashboardLeads(
      request,
      environment,
      session.user.email,
      dashboardFetch,
      "validation-error",
      "Lead status could not be saved.",
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: `/dashboard/leads?lead=${encodeURIComponent(leadId)}&saved=1`,
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "no-store",
    },
  });
}

async function readDashboardLeads(
  environment: DashboardAccessEnvironment,
  dashboardFetch: DashboardFetch,
): Promise<
  | { ok: true; leads: DashboardLead[] }
  | { ok: false; error: string }
> {
  const response = await dashboardFetch(
    `${environment.CONVEX_SITE_URL.replace(/\/$/, "")}/dashboard/leads`,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${environment.DASHBOARD_API_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    return { ok: false, error: "Lead workflow provider is unavailable." };
  }

  const payload = await response.json() as { leads?: DashboardLead[] };

  return { ok: true, leads: payload.leads ?? [] };
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

function valueFromFormData(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isDashboardLeadStatus(value: string | undefined): value is DashboardLeadStatus {
  return isOneOf(value, DASHBOARD_LEAD_STATUSES);
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
