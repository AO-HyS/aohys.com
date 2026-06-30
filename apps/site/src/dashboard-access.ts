import {
  renderDashboardContentWorkflow,
  renderDashboardLeadWorkflow,
  renderDashboardShell,
  renderDashboardSignIn,
  renderDashboardState,
  DASHBOARD_LEAD_STATUSES,
  type DashboardCaseStudyMetadata,
  type DashboardContentWorkflowState,
  type DashboardLead,
  type DashboardLeadStatus,
  type DashboardLeadWorkflowState,
  type DashboardMediaMetadata,
  type DashboardResumeVersion,
  type DashboardSiteSetting,
} from "@aohys/dashboard-ui";
import { PUBLIC_CONTENT_NODES, getLocaleVariant } from "@aohys/content-graph";
import { isOneOf } from "@aohys/core";
import { validateEnvironmentContract, type EnvironmentName } from "@aohys/environment";
import { capturePostHogServerEvent } from "./posthog-server.js";

export interface DashboardAccessEnvironment extends Record<string, string | undefined> {
  AOHYS_ENV: EnvironmentName;
  PUBLIC_SITE_URL: string;
  CONVEX_SITE_URL: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_TRUSTED_ORIGINS: string;
  ADMIN_EMAIL: string;
  DASHBOARD_API_TOKEN: string;
  PUBLIC_POSTHOG_KEY?: string;
  PUBLIC_POSTHOG_HOST?: string;
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

type DashboardContentActionPath =
  | "/dashboard/content/case-study"
  | "/dashboard/content/media"
  | "/dashboard/content/setting"
  | "/dashboard/content/resume";

interface DashboardContentPayload {
  caseStudies?: Array<{
    contentId: string;
    status: DashboardCaseStudyMetadata["status"];
    evidenceStatus: DashboardCaseStudyMetadata["evidenceStatus"];
    updatedAt: number;
  }>;
  media?: DashboardMediaMetadata[];
  settings?: DashboardSiteSetting[];
  resumeVersions?: DashboardResumeVersion[];
}

const PRIVATE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
  "cache-control": "no-store",
} as const;

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

  if (isDashboardContentActionPath(path) && request.method === "POST") {
    return updateDashboardContentMetadata(request, environment, fetchSession, path);
  }

  if (isDashboardContentActionPath(path)) {
    return new Response(null, {
      status: 405,
      headers: {
        allow: "POST",
        "x-robots-tag": "noindex, nofollow",
        "cache-control": "no-store",
      },
    });
  }

  if (isDashboardContentPath(path)) {
    return renderDashboardContent(request, environment, session.user.email, fetchSession);
  }

  return htmlResponse(renderDashboardShell({
    adminEmail: session.user.email,
    activePath: path,
    title: titleForPath(path),
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

async function renderDashboardContent(
  request: Request,
  environment: DashboardAccessEnvironment,
  adminEmail: string,
  dashboardFetch: DashboardFetch,
  workflowState?: DashboardContentWorkflowState,
  validationMessage?: string,
): Promise<Response> {
  const path = normalizeDashboardPath(new URL(request.url).pathname);
  const contentResult = await readDashboardContent(environment, dashboardFetch);

  if (!contentResult.ok) {
    return htmlResponse(renderDashboardContentWorkflow({
      adminEmail,
      activePath: path,
      title: titleForPath(path),
      caseStudies: buildDashboardCaseStudyRows([]),
      media: [],
      settings: [],
      resumeVersions: [],
      workflowState: "configuration-error",
      validationMessage: contentResult.error,
    }), 502);
  }

  return htmlResponse(renderDashboardContentWorkflow({
    adminEmail,
    activePath: path,
    title: titleForPath(path),
    caseStudies: buildDashboardCaseStudyRows(contentResult.content.caseStudies ?? []),
    media: contentResult.content.media ?? [],
    settings: contentResult.content.settings ?? [],
    resumeVersions: contentResult.content.resumeVersions ?? [],
    workflowState: workflowState ?? (new URL(request.url).searchParams.get("saved") === "1" ? "save-success" : undefined),
    validationMessage,
  }));
}

async function updateDashboardContentMetadata(
  request: Request,
  environment: DashboardAccessEnvironment,
  dashboardFetch: DashboardFetch,
  actionPath: DashboardContentActionPath,
): Promise<Response> {
  const formData = await request.formData();
  const payload = contentPayloadFromFormData(formData, actionPath, environment.AOHYS_ENV);
  const response = await dashboardFetch(
    `${environment.CONVEX_SITE_URL.replace(/\/$/, "")}${actionPath}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${environment.DASHBOARD_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const cookie = request.headers.get("cookie") ?? "";
    const session = await readBetterAuthSession(environment, cookie, dashboardFetch);

    if (!session) {
      return redirectToSignIn("/dashboard/case-studies");
    }

    return renderDashboardContent(
      request,
      environment,
      session.user.email,
      dashboardFetch,
      "validation-error",
      "Content metadata could not be saved.",
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: `${redirectPathForContentAction(actionPath)}?saved=1`,
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "no-store",
    },
  });
}

async function readDashboardContent(
  environment: DashboardAccessEnvironment,
  dashboardFetch: DashboardFetch,
): Promise<
  | { ok: true; content: DashboardContentPayload }
  | { ok: false; error: string }
> {
  const response = await dashboardFetch(
    `${environment.CONVEX_SITE_URL.replace(/\/$/, "")}/dashboard/content`,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${environment.DASHBOARD_API_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    return { ok: false, error: "Content workflow provider is unavailable." };
  }

  return { ok: true, content: await response.json() as DashboardContentPayload };
}

function buildDashboardCaseStudyRows(
  metadataRows: NonNullable<DashboardContentPayload["caseStudies"]>,
): DashboardCaseStudyMetadata[] {
  const metadataByContentId = new Map(metadataRows.map((row) => [row.contentId, row]));

  return PUBLIC_CONTENT_NODES
    .filter((node) => node.type === "case-study")
    .map((node) => {
      const englishVariant = getLocaleVariant(node, "en");
      const spanishVariant = getLocaleVariant(node, "es");
      const metadata = metadataByContentId.get(node.id);

      return {
        contentId: node.id,
        title: englishVariant.title,
        englishPath: englishVariant.path,
        spanishPath: spanishVariant.path,
        sitemapIncluded: node.status === "published" && node.sitemap.include,
        status: metadata?.status ?? "active-build",
        evidenceStatus: metadata?.evidenceStatus ?? "missing",
        updatedAt: metadata?.updatedAt ?? 0,
      };
    });
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

function isDashboardContentPath(path: string): boolean {
  return ["/dashboard/case-studies", "/dashboard/media", "/dashboard/settings", "/dashboard/resume"]
    .includes(path);
}

function isDashboardContentActionPath(path: string): path is DashboardContentActionPath {
  return [
    "/dashboard/content/case-study",
    "/dashboard/content/media",
    "/dashboard/content/setting",
    "/dashboard/content/resume",
  ].includes(path);
}

function contentPayloadFromFormData(
  formData: FormData,
  actionPath: DashboardContentActionPath,
  environment: EnvironmentName,
): Record<string, string | boolean | undefined> {
  switch (actionPath) {
    case "/dashboard/content/case-study":
      return {
        contentId: valueFromFormData(formData.get("contentId")),
        status: valueFromFormData(formData.get("status")),
        evidenceStatus: valueFromFormData(formData.get("evidenceStatus")),
      };
    case "/dashboard/content/media":
      return {
        storageProvider: "external",
        storageKey: valueFromFormData(formData.get("storageKey")),
        publicUrl: valueFromFormData(formData.get("publicUrl")),
        altText: valueFromFormData(formData.get("altText")),
        contentId: valueFromFormData(formData.get("contentId")),
        usage: valueFromFormData(formData.get("usage")),
        status: "draft",
        locale: valueFromFormData(formData.get("locale")),
      };
    case "/dashboard/content/setting":
      return {
        key: valueFromFormData(formData.get("key")),
        environment,
        value: valueFromFormData(formData.get("value")),
        classification: valueFromFormData(formData.get("classification")),
      };
    case "/dashboard/content/resume":
      return {
        locale: valueFromFormData(formData.get("locale")),
        version: valueFromFormData(formData.get("version")),
        pdfPath: valueFromFormData(formData.get("pdfPath")),
        isPublished: formData.get("isPublished") === "on",
      };
  }
}

function redirectPathForContentAction(actionPath: DashboardContentActionPath): string {
  switch (actionPath) {
    case "/dashboard/content/media":
      return "/dashboard/media";
    case "/dashboard/content/setting":
      return "/dashboard/settings";
    case "/dashboard/content/resume":
      return "/dashboard/resume";
    default:
      return "/dashboard/case-studies";
  }
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
    case "/dashboard/resume":
      return "Resume";
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
