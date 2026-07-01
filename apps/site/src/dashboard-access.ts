import {
  renderDashboardLeadWorkflow,
  renderDashboardSignIn,
  renderDashboardState,
  DASHBOARD_LEAD_STATUSES,
  type DashboardCaseStudyMetadata,
  type DashboardLead,
  type DashboardLeadStatus,
  type DashboardLeadWorkflowState,
  type DashboardMediaMetadata,
  type DashboardResumeVersion,
  type DashboardSiteSetting,
} from "@aohys/dashboard-ui";
import {
  PUBLIC_CONTENT_NODES,
  getCaseStudyPageContent,
  getLocaleVariant,
} from "@aohys/content-graph";
import { isOneOf } from "@aohys/core";
import { validateEnvironmentContract, type EnvironmentName } from "@aohys/environment";
import { capturePostHogServerEvent } from "./posthog-server.js";
import { PRIVATE_HTML_HEADERS, PRIVATE_NO_STORE_HEADERS } from "./security-headers.js";

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
  | "/dashboard/content/project"
  | "/dashboard/content/media"
  | "/dashboard/content/setting"
  | "/dashboard/content/resume";

type DashboardApiPath =
  | "/dashboard/api/content"
  | "/dashboard/api/content/project"
  | "/dashboard/api/content/media"
  | "/dashboard/api/content/setting"
  | "/dashboard/api/content/resume"
  | "/dashboard/api/leads"
  | "/dashboard/api/leads/status";

interface DashboardContentPayload {
  caseStudies?: Array<{
    contentId: string;
    status: DashboardCaseStudyMetadata["status"];
    evidenceStatus: DashboardCaseStudyMetadata["evidenceStatus"];
    updatedAt: number;
  }>;
  projectDrafts?: DashboardProjectDraft[];
  media?: DashboardMediaMetadata[];
  settings?: DashboardSiteSetting[];
  resumeVersions?: DashboardResumeVersion[];
}

interface DashboardProjectDraft {
  contentId: string;
  locale: "en" | "es";
  title: string;
  summary: string;
  seoDescription: string;
  projectUrl?: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
  updatedAt: number;
}

interface DashboardProject {
  contentId: string;
  title: string;
  englishPath: string;
  spanishPath: string;
  sitemapIncluded: boolean;
  status: DashboardCaseStudyMetadata["status"];
  evidenceStatus: DashboardCaseStudyMetadata["evidenceStatus"];
  projectUrl?: string;
  updatedAt: number;
  locales: Array<{
    locale: "en" | "es";
    path: string;
    title: string;
    summary: string;
    seoDescription: string;
    ctaLabel: string;
    ctaHref: string;
    overview: string;
    achievements: string;
    structureNotes: string;
    draft?: DashboardProjectDraft;
  }>;
  images: Array<{
    label: string;
    altText: string;
    source: "content-graph" | "media-metadata";
    href?: string;
    src?: string;
    storageKey?: string;
    status?: DashboardMediaMetadata["status"];
    usage?: DashboardMediaMetadata["usage"];
  }>;
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
    if (isDashboardApiPath(path)) {
      return privateJsonResponse({ error: "Dashboard session is required." }, { status: 401 });
    }

    return redirectToSignIn(path);
  }

  const session = await readBetterAuthSession(environment, cookie, fetchSession);
  if (!session) {
    if (isDashboardApiPath(path)) {
      return privateJsonResponse({ error: "Dashboard session is invalid." }, { status: 401 });
    }

    return redirectToSignIn(path);
  }

  const adminEmails = parseAdminEmails(environment.ADMIN_EMAIL);
  const sessionEmail = session.user.email.toLowerCase();

  if (!adminEmails.includes(sessionEmail)) {
    if (isDashboardApiPath(path)) {
      return privateJsonResponse({ error: "Dashboard access is restricted." }, { status: 403 });
    }

    return htmlResponse(renderDashboardState("unauthorized"), 403);
  }

  if (path === "/dashboard/leads/status" && request.method === "POST") {
    return updateDashboardLeadStatus(request, environment, fetchSession);
  }

  if (path === "/dashboard/leads/status") {
    return new Response(null, {
      status: 405,
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        allow: "POST",
      },
    });
  }

  if (isDashboardContentActionPath(path) && request.method === "POST") {
    return updateDashboardContentMetadata(request, environment, fetchSession, path);
  }

  if (isDashboardContentActionPath(path)) {
    return new Response(null, {
      status: 405,
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        allow: "POST",
      },
    });
  }

  if (isDashboardApiPath(path)) {
    return handleDashboardApiRequest(request, environment, fetchSession, path);
  }

  if (isDashboardAppPath(path)) {
    return htmlResponse(renderDashboardAppShell({
      adminEmail: session.user.email,
      environment: environment.AOHYS_ENV,
    }));
  }

  return htmlResponse(renderDashboardAppShell({
    adminEmail: session.user.email,
    environment: environment.AOHYS_ENV,
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
      return redirectToSignIn("/dashboard/projects");
    }

    return privateJsonResponse({ ok: false, error: "Content metadata could not be saved." }, { status: 400 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...PRIVATE_NO_STORE_HEADERS,
      location: `${redirectPathForContentAction(actionPath)}?saved=1`,
    },
  });
}

async function handleDashboardApiRequest(
  request: Request,
  environment: DashboardAccessEnvironment,
  dashboardFetch: DashboardFetch,
  path: DashboardApiPath,
): Promise<Response> {
  if (path === "/dashboard/api/content" && request.method === "GET") {
    const contentResult = await readDashboardContent(environment, dashboardFetch);

    if (!contentResult.ok) {
      return privateJsonResponse({ error: contentResult.error }, { status: 502 });
    }

    const media = contentResult.content.media ?? [];

    return privateJsonResponse({
      projects: buildDashboardProjectRows(contentResult.content, media),
      media,
      settings: contentResult.content.settings ?? [],
      resumeVersions: contentResult.content.resumeVersions ?? [],
    });
  }

  if (path === "/dashboard/api/leads" && request.method === "GET") {
    const leadResult = await readDashboardLeads(environment, dashboardFetch);

    if (!leadResult.ok) {
      return privateJsonResponse({ error: leadResult.error }, { status: 502 });
    }

    return privateJsonResponse({ leads: leadResult.leads });
  }

  if (path === "/dashboard/api/leads/status" && request.method === "POST") {
    return forwardDashboardJsonRequest(
      request,
      environment,
      dashboardFetch,
      "/dashboard/leads/status",
    );
  }

  if (path.startsWith("/dashboard/api/content/") && request.method === "POST") {
    const actionPath = path.replace("/dashboard/api", "/dashboard") as DashboardContentActionPath;
    const body = await request.json() as Record<string, unknown>;
    const payload = actionPath === "/dashboard/content/setting"
      ? { ...body, environment: environment.AOHYS_ENV }
      : body;

    return forwardDashboardJsonPayload(environment, dashboardFetch, actionPath, payload);
  }

  return new Response(null, {
    status: 405,
    headers: {
      ...PRIVATE_NO_STORE_HEADERS,
      allow: path.endsWith("/content") || path.endsWith("/leads") ? "GET" : "POST",
    },
  });
}

async function forwardDashboardJsonRequest(
  request: Request,
  environment: DashboardAccessEnvironment,
  dashboardFetch: DashboardFetch,
  convexPath: string,
): Promise<Response> {
  const payload = await request.json() as Record<string, unknown>;
  return forwardDashboardJsonPayload(environment, dashboardFetch, convexPath, payload);
}

async function forwardDashboardJsonPayload(
  environment: DashboardAccessEnvironment,
  dashboardFetch: DashboardFetch,
  convexPath: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const response = await dashboardFetch(
    `${environment.CONVEX_SITE_URL.replace(/\/$/, "")}${convexPath}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${environment.DASHBOARD_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const responsePayload = await readJsonResponse(response);

  return privateJsonResponse(responsePayload, { status: response.status });
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

function buildDashboardProjectRows(
  content: DashboardContentPayload,
  mediaRows: DashboardMediaMetadata[],
): DashboardProject[] {
  const caseStudyRows = buildDashboardCaseStudyRows(content.caseStudies ?? []);
  const metadataByContentId = new Map(caseStudyRows.map((row) => [row.contentId, row]));
  const draftsByContentIdAndLocale = new Map(
    (content.projectDrafts ?? []).map((draft) => [`${draft.contentId}:${draft.locale}`, draft]),
  );

  return PUBLIC_CONTENT_NODES
    .filter((node) => node.type === "case-study")
    .map((node) => {
      const metadata = metadataByContentId.get(node.id);
      const englishVariant = getLocaleVariant(node, "en");
      const spanishVariant = getLocaleVariant(node, "es");
      const publicEvidence = getCaseStudyPageContent(node.id, "en")?.publicEvidence ?? [];
      const media = mediaRows.filter((item) => item.contentId === node.id);
      const firstProjectUrl = publicEvidence.find((item) => isHttpUrl(item.href))?.href;
      const firstDraftUrl = (content.projectDrafts ?? [])
        .find((draft) => draft.contentId === node.id && draft.projectUrl)?.projectUrl;

      return {
        contentId: node.id,
        title: englishVariant.title,
        englishPath: englishVariant.path,
        spanishPath: spanishVariant.path,
        sitemapIncluded: node.status === "published" && node.sitemap.include,
        status: metadata?.status ?? "active-build",
        evidenceStatus: metadata?.evidenceStatus ?? "missing",
        projectUrl: firstDraftUrl ?? firstProjectUrl,
        updatedAt: metadata?.updatedAt ?? 0,
        locales: (["en", "es"] as const).map((locale) => {
          const variant = getLocaleVariant(node, locale);
          const pageContent = getCaseStudyPageContent(node.id, locale);
          const draft = draftsByContentIdAndLocale.get(`${node.id}:${locale}`);

          return {
            locale,
            path: variant.path,
            title: variant.title,
            summary: variant.summary,
            seoDescription: variant.seoDescription,
            ctaLabel: variant.primaryActionLabel ?? "Contact",
            ctaHref: variant.primaryActionContentId
              ? getLocaleVariant(variant.primaryActionContentId, locale).path
              : variant.path,
            overview: pageContent?.overview ?? variant.summary,
            achievements: [
              pageContent?.businessOutcome.body,
              pageContent?.executionHighlights.body,
            ].filter(Boolean).join("\n\n") || variant.summary,
            structureNotes: [
              pageContent?.architectureDecisions.body,
              pageContent?.qualitySecurityPerformance.body,
            ].filter(Boolean).join("\n\n") || variant.summary,
            draft,
          };
        }),
        images: [
          ...publicEvidence.map((asset) => ({
            label: asset.label,
            altText: asset.altText,
            source: "content-graph" as const,
            href: asset.href,
          })),
          ...media.map((item) => ({
            label: item.storageKey,
            altText: item.altText,
            source: "media-metadata" as const,
            href: item.publicUrl,
            src: item.publicUrl,
            storageKey: item.storageKey,
            status: item.status,
            usage: item.usage,
          })),
        ],
      };
    });
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
      ...PRIVATE_NO_STORE_HEADERS,
      location: `/dashboard/leads?lead=${encodeURIComponent(leadId)}&saved=1`,
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

function privateJsonResponse(body: Record<string, unknown>, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...PRIVATE_NO_STORE_HEADERS,
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {
      ok: response.ok,
      error: response.ok ? undefined : "Dashboard provider returned an invalid response.",
    };
  }
}

function renderDashboardAppShell(input: {
  adminEmail: string;
  environment: EnvironmentName;
}): string {
  const config = JSON.stringify(input).replaceAll("<", "\\u003c");

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
    <script>window.__AOHYS_DASHBOARD__ = ${config};</script>
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

function valueFromFormData(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isDashboardLeadStatus(value: string | undefined): value is DashboardLeadStatus {
  return isOneOf(value, DASHBOARD_LEAD_STATUSES);
}

function isDashboardContentPath(path: string): boolean {
  return ["/dashboard/projects", "/dashboard/case-studies", "/dashboard/media", "/dashboard/settings", "/dashboard/resume"]
    .includes(path);
}

function isDashboardAppPath(path: string): boolean {
  return path === "/dashboard" || path === "/dashboard/leads" || isDashboardContentPath(path);
}

function isDashboardApiPath(path: string): path is DashboardApiPath {
  return [
    "/dashboard/api/content",
    "/dashboard/api/content/project",
    "/dashboard/api/content/media",
    "/dashboard/api/content/setting",
    "/dashboard/api/content/resume",
    "/dashboard/api/leads",
    "/dashboard/api/leads/status",
  ].includes(path);
}

function isDashboardContentActionPath(path: string): path is DashboardContentActionPath {
  return [
    "/dashboard/content/case-study",
    "/dashboard/content/project",
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
    case "/dashboard/content/project":
      return {
        contentId: valueFromFormData(formData.get("contentId")),
        locale: valueFromFormData(formData.get("locale")),
        status: valueFromFormData(formData.get("status")),
        evidenceStatus: valueFromFormData(formData.get("evidenceStatus")),
        title: valueFromFormData(formData.get("title")),
        summary: valueFromFormData(formData.get("summary")),
        seoDescription: valueFromFormData(formData.get("seoDescription")),
        projectUrl: valueFromFormData(formData.get("projectUrl")),
        ctaLabel: valueFromFormData(formData.get("ctaLabel")),
        ctaHref: valueFromFormData(formData.get("ctaHref")),
        achievements: valueFromFormData(formData.get("achievements")),
        structureNotes: valueFromFormData(formData.get("structureNotes")),
      };
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
    case "/dashboard/content/project":
      return "/dashboard/projects";
    case "/dashboard/content/media":
      return "/dashboard/projects";
    case "/dashboard/content/setting":
      return "/dashboard/projects";
    case "/dashboard/content/resume":
      return "/dashboard/resume";
    default:
      return "/dashboard/projects";
  }
}

function parseAdminEmails(value: string): string[] {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
