export type DashboardState =
  | "loading"
  | "unauthorized"
  | "configuration-error"
  | "unavailable";

export type DashboardLeadStatus = "new" | "reviewing" | "closed";

export const DASHBOARD_LEAD_STATUSES = ["new", "reviewing", "closed"] as const;

export type DashboardLeadWorkflowState =
  | "loading"
  | "empty"
  | "ready"
  | "validation-error"
  | "save-pending"
  | "save-success"
  | "unauthorized"
  | "configuration-error";

export type DashboardContentWorkflowState =
  | "loading"
  | "empty"
  | "ready"
  | "validation-error"
  | "save-pending"
  | "save-success"
  | "unauthorized"
  | "environment-unavailable"
  | "configuration-error";

export type DashboardCaseStudyStatus =
  | "production-proof"
  | "active-build"
  | "private-build"
  | "enterprise-confidential"
  | "engineering-practice";

export type DashboardEvidenceStatus = "missing" | "sanitized" | "published";
export type DashboardMediaStorageProvider = "cloudflare-images" | "cloudflare-r2" | "external";
export type DashboardMediaUsage = "case-study" | "resume" | "architecture" | "site";
export type DashboardMediaStatus = "draft" | "published" | "archived";
export type DashboardSettingClassification = "public-build-value" | "provider-output" | "policy-value";

export interface DashboardShellInput {
  adminEmail: string;
  activePath: string;
  title: string;
}

export interface DashboardSignInInput {
  signInUrl: string;
}

export interface DashboardLead {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  preferredContactPath?: "email" | "whatsapp";
  consentToContact?: boolean;
  intent: string;
  message: string;
  sourcePath: string;
  locale: "en" | "es";
  referrer?: string;
  status: DashboardLeadStatus;
  createdAt: number;
  updatedAt: number;
}

export interface DashboardLeadWorkflowInput extends DashboardShellInput {
  leads: DashboardLead[];
  selectedLeadId?: string;
  workflowState?: DashboardLeadWorkflowState;
  validationMessage?: string;
}

export interface DashboardCaseStudyMetadata {
  contentId: string;
  title: string;
  englishPath: string;
  spanishPath: string;
  sitemapIncluded: boolean;
  status: DashboardCaseStudyStatus;
  evidenceStatus: DashboardEvidenceStatus;
  updatedAt: number;
}

export interface DashboardMediaMetadata {
  id: string;
  storageProvider: DashboardMediaStorageProvider;
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId?: string;
  usage: DashboardMediaUsage;
  status: DashboardMediaStatus;
  locale?: "en" | "es";
  updatedAt: number;
}

export interface DashboardSiteSetting {
  key: string;
  environment: "local" | "preview" | "production";
  value: string;
  classification: DashboardSettingClassification;
  updatedAt: number;
}

export interface DashboardResumeVersion {
  id: string;
  locale: "en" | "es";
  version: string;
  pdfPath: string;
  isPublished: boolean;
  createdAt: number;
  publishedAt?: number;
}

export interface DashboardContentWorkflowInput extends DashboardShellInput {
  caseStudies: DashboardCaseStudyMetadata[];
  media: DashboardMediaMetadata[];
  settings: DashboardSiteSetting[];
  resumeVersions: DashboardResumeVersion[];
  workflowState?: DashboardContentWorkflowState;
  validationMessage?: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/case-studies", label: "Case studies" },
  { href: "/dashboard/media", label: "Media" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/resume", label: "Resume" },
] as const;

const STATE_COPY: Record<DashboardState, { title: string; body: string; status: string }> = {
  loading: {
    title: "Checking access",
    body: "The dashboard is validating your session before showing private operations.",
    status: "Loading",
  },
  unauthorized: {
    title: "Dashboard access is restricted",
    body: "This private surface is limited to the configured AOHYS admin allowlist.",
    status: "Unauthorized",
  },
  "configuration-error": {
    title: "Dashboard configuration needs attention",
    body: "Auth origins, secrets, or the admin allowlist are not aligned with the active environment.",
    status: "Configuration error",
  },
  unavailable: {
    title: "Dashboard is temporarily unavailable",
    body: "The auth provider could not be reached. Public pages and lead intake remain separate.",
    status: "Unavailable",
  },
};

export function renderDashboardShell(input: DashboardShellInput): string {
  return renderDashboardChrome({
    ...input,
    body: `
      <section class="dashboard-overview" data-dashboard-surface="overview" aria-labelledby="dashboard-overview-title">
        <div>
          <p class="dashboard-kicker">Operational overview</p>
          <h2 id="dashboard-overview-title">Operations overview</h2>
          <p>Review leads, content readiness, media metadata, and release state from one private surface.</p>
        </div>
        <div class="dashboard-metrics" aria-label="Dashboard setup status">
          <div><span>Auth</span><strong>Better Auth</strong></div>
          <div><span>Backend</span><strong>Convex</strong></div>
          <div><span>Privacy</span><strong>Noindex</strong></div>
        </div>
      </section>
      <section class="dashboard-workflow-grid" aria-label="Dashboard workflows">
        ${renderWorkflowCard("New leads", "Review incoming project or hiring conversations.")}
        ${renderWorkflowCard("Content safety", "Keep case studies and resume content aligned with public-safe evidence.")}
        ${renderWorkflowCard("Media queue", "Track screenshots, generated assets, alt text, and Cloudflare delivery metadata.")}
      </section>
    `,
  });
}

export function renderDashboardLeadWorkflow(input: DashboardLeadWorkflowInput): string {
  const selectedLead = input.leads.find((lead) => lead.id === input.selectedLeadId) ?? input.leads[0];
  const workflowState = input.workflowState ?? (input.leads.length > 0 ? "ready" : "empty");

  return renderDashboardChrome({
    ...input,
    body: `
      <section class="lead-workflow" data-dashboard-surface="lead-workflow" data-workflow-state="${workflowState}" aria-labelledby="lead-workflow-title">
        <div class="lead-list-panel">
          <div class="dashboard-section-heading">
            <p class="dashboard-kicker">Lead review</p>
            <h2 id="lead-workflow-title">Incoming leads</h2>
            <p>${input.leads.length} lead${input.leads.length === 1 ? "" : "s"} ready for review.</p>
          </div>
          ${renderLeadWorkflowNotice(workflowState, input.validationMessage)}
          ${input.leads.length > 0 ? renderLeadList(input.leads, selectedLead?.id) : renderLeadEmptyState()}
        </div>
        <div class="lead-detail-panel">
          ${selectedLead ? renderLeadDetail(selectedLead) : renderLeadPlaceholder()}
        </div>
      </section>
    `,
  });
}

export function renderDashboardContentWorkflow(input: DashboardContentWorkflowInput): string {
  const itemCount = input.caseStudies.length + input.media.length + input.settings.length + input.resumeVersions.length;
  const workflowState = input.workflowState ?? (itemCount > 0 ? "ready" : "empty");

  return renderDashboardChrome({
    ...input,
    body: `
      <section class="content-workflow" data-dashboard-surface="content-workflow" data-workflow-state="${workflowState}" aria-labelledby="content-workflow-title">
        <div class="dashboard-section-heading">
          <p class="dashboard-kicker">Publishing guardrails</p>
          <h2 id="content-workflow-title">Content and media workflow</h2>
          <p>Review public graph metadata, media safety, site settings, and resume versions before anything reaches the public surface.</p>
        </div>
        ${renderContentWorkflowNotice(workflowState, input.validationMessage)}
        <div class="content-panel-grid">
          ${renderCaseStudyPanel(input.caseStudies)}
          ${renderMediaPanel(input.media, input.caseStudies)}
          ${renderSettingsPanel(input.settings)}
          ${renderResumePanel(input.resumeVersions)}
        </div>
      </section>
    `,
  });
}

function renderContentWorkflowNotice(
  state: DashboardContentWorkflowState,
  validationMessage?: string,
): string {
  switch (state) {
    case "save-success":
      return `<p class="dashboard-notice" role="status">Content metadata saved. Public pages still render through the Public Content Graph.</p>`;
    case "validation-error":
      return `<p class="dashboard-notice dashboard-notice-warning" role="alert">${escapeHtml(validationMessage ?? "Content metadata could not be saved.")}</p>`;
    case "loading":
      return `<p class="dashboard-notice" role="status">Loading content workflow...</p>`;
    case "save-pending":
      return `<p class="dashboard-notice" role="status">Saving content metadata...</p>`;
    case "unauthorized":
      return `<p class="dashboard-notice dashboard-notice-warning" role="alert">Content workflows are restricted to allowlisted admins.</p>`;
    case "environment-unavailable":
      return `<p class="dashboard-notice dashboard-notice-warning" role="alert">Content workflows are unavailable until the Environment Contract is complete.</p>`;
    case "configuration-error":
      return `<p class="dashboard-notice dashboard-notice-warning" role="alert">Content workflow provider configuration needs attention.</p>`;
    case "empty":
      return `<p class="dashboard-notice" role="status">No content metadata exists yet. Public graph nodes still define the published surface.</p>`;
    default:
      return "";
  }
}

function renderCaseStudyPanel(caseStudies: DashboardCaseStudyMetadata[]): string {
  return `
    <article class="content-panel" aria-labelledby="content-case-studies-title">
      <div>
        <p class="dashboard-kicker">Case studies</p>
        <h3 id="content-case-studies-title">Public graph metadata</h3>
      </div>
      <div class="content-list">
        ${caseStudies.length > 0 ? caseStudies.map(renderCaseStudyRow).join("") : renderContentEmptyState("No case-study metadata yet.")}
      </div>
    </article>
  `;
}

function renderCaseStudyRow(caseStudy: DashboardCaseStudyMetadata): string {
  return `
    <section class="content-row">
      <div>
        <strong>${escapeHtml(caseStudy.title)}</strong>
        <span>${escapeHtml(caseStudy.contentId)}</span>
        <span>${escapeHtml(caseStudy.englishPath)} · ${escapeHtml(caseStudy.spanishPath)}</span>
        <span>${caseStudy.sitemapIncluded ? "Sitemap eligible" : "Noindex protected"}</span>
      </div>
      <form class="content-form" method="post" action="/dashboard/content/case-study">
        <input type="hidden" name="contentId" value="${escapeHtml(caseStudy.contentId)}" />
        <label>
          <span>Status</span>
          <select name="status">
            ${renderCaseStudyStatusOption("production-proof", caseStudy.status)}
            ${renderCaseStudyStatusOption("active-build", caseStudy.status)}
            ${renderCaseStudyStatusOption("private-build", caseStudy.status)}
            ${renderCaseStudyStatusOption("enterprise-confidential", caseStudy.status)}
            ${renderCaseStudyStatusOption("engineering-practice", caseStudy.status)}
          </select>
        </label>
        <label>
          <span>Evidence</span>
          <select name="evidenceStatus">
            ${renderEvidenceStatusOption("missing", caseStudy.evidenceStatus)}
            ${renderEvidenceStatusOption("sanitized", caseStudy.evidenceStatus)}
            ${renderEvidenceStatusOption("published", caseStudy.evidenceStatus)}
          </select>
        </label>
        <button class="dashboard-action" type="submit">Save metadata</button>
      </form>
    </section>
  `;
}

function renderMediaPanel(
  mediaItems: DashboardMediaMetadata[],
  caseStudies: DashboardCaseStudyMetadata[],
): string {
  return `
    <article class="content-panel" aria-labelledby="content-media-title">
      <div>
        <p class="dashboard-kicker">Media</p>
        <h3 id="content-media-title">Metadata and safety</h3>
      </div>
      <form class="content-form content-create-form" method="post" action="/dashboard/content/media">
        <label>
          <span>Storage key</span>
          <input name="storageKey" placeholder="screenshots/casa-roca-home" />
        </label>
        <label>
          <span>Alt text</span>
          <textarea name="altText" rows="3" placeholder="Describe the image for public readers."></textarea>
        </label>
        <label>
          <span>Usage intent</span>
          <select name="usage">
            <option value="case-study">Case study</option>
            <option value="resume">Resume</option>
            <option value="architecture">Architecture</option>
            <option value="site">Site</option>
          </select>
        </label>
        <label>
          <span>Content ID</span>
          <select name="contentId">
            <option value="">No public content node yet</option>
            ${caseStudies.map((caseStudy) => `<option value="${escapeHtml(caseStudy.contentId)}">${escapeHtml(caseStudy.title)}</option>`).join("")}
          </select>
        </label>
        <button class="dashboard-action" type="submit">Add media metadata</button>
      </form>
      <div class="content-list">
        ${mediaItems.length > 0 ? mediaItems.map(renderMediaRow).join("") : renderContentEmptyState("No media metadata yet.")}
      </div>
    </article>
  `;
}

function renderMediaRow(media: DashboardMediaMetadata): string {
  return `
    <section class="content-row">
      <div>
        <strong>${escapeHtml(media.storageKey)}</strong>
        <span>${formatLabel(media.storageProvider)} · ${formatLabel(media.usage)} · ${formatLabel(media.status)}</span>
        <span>${escapeHtml(media.altText)}</span>
        ${media.contentId ? `<span>${escapeHtml(media.contentId)}</span>` : ""}
      </div>
    </section>
  `;
}

function renderSettingsPanel(settings: DashboardSiteSetting[]): string {
  return `
    <article class="content-panel" aria-labelledby="content-settings-title">
      <div>
        <p class="dashboard-kicker">Settings</p>
        <h3 id="content-settings-title">Public-safe values</h3>
      </div>
      <form class="content-form content-create-form" method="post" action="/dashboard/content/setting">
        <label>
          <span>Key</span>
          <input name="key" placeholder="PUBLIC_WHATSAPP_URL" />
        </label>
        <label>
          <span>Value</span>
          <input name="value" placeholder="https://wa.me/..." />
        </label>
        <label>
          <span>Classification</span>
          <select name="classification">
            <option value="public-build-value">Public build value</option>
            <option value="provider-output">Provider output</option>
            <option value="policy-value">Policy value</option>
          </select>
        </label>
        <button class="dashboard-action" type="submit">Save setting</button>
      </form>
      <div class="content-list">
        ${settings.length > 0 ? settings.map(renderSettingRow).join("") : renderContentEmptyState("No dashboard-managed settings yet.")}
      </div>
    </article>
  `;
}

function renderSettingRow(setting: DashboardSiteSetting): string {
  return `
    <section class="content-row">
      <div>
        <strong>${escapeHtml(setting.key)}</strong>
        <span>${escapeHtml(setting.environment)} · ${formatLabel(setting.classification)}</span>
        <span>${escapeHtml(setting.value)}</span>
      </div>
    </section>
  `;
}

function renderResumePanel(resumeVersions: DashboardResumeVersion[]): string {
  return `
    <article class="content-panel" aria-labelledby="content-resume-title">
      <div>
        <p class="dashboard-kicker">Resume</p>
        <h3 id="content-resume-title">Version alignment</h3>
      </div>
      <form class="content-form content-create-form" method="post" action="/dashboard/content/resume">
        <label>
          <span>Locale</span>
          <select name="locale">
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </label>
        <label>
          <span>Version</span>
          <input name="version" placeholder="2026.06" />
        </label>
        <label>
          <span>PDF path</span>
          <input name="pdfPath" placeholder="/downloads/alejandro-ortiz-corro-resume.pdf" />
        </label>
        <button class="dashboard-action" type="submit">Add resume version</button>
      </form>
      <div class="content-list">
        ${resumeVersions.length > 0 ? resumeVersions.map(renderResumeVersionRow).join("") : renderContentEmptyState("No resume versions yet.")}
      </div>
    </article>
  `;
}

function renderResumeVersionRow(resumeVersion: DashboardResumeVersion): string {
  return `
    <section class="content-row">
      <div>
        <strong>${escapeHtml(resumeVersion.version)}</strong>
        <span>${escapeHtml(resumeVersion.locale)} · ${resumeVersion.isPublished ? "Published" : "Draft"}</span>
        <span>${escapeHtml(resumeVersion.pdfPath)}</span>
      </div>
    </section>
  `;
}

function renderContentEmptyState(message: string): string {
  return `<p class="content-empty-state">${escapeHtml(message)}</p>`;
}

function renderCaseStudyStatusOption(
  status: DashboardCaseStudyStatus,
  selectedStatus: DashboardCaseStudyStatus,
): string {
  return `<option value="${status}"${status === selectedStatus ? " selected" : ""}>${formatLabel(status)}</option>`;
}

function renderEvidenceStatusOption(
  status: DashboardEvidenceStatus,
  selectedStatus: DashboardEvidenceStatus,
): string {
  return `<option value="${status}"${status === selectedStatus ? " selected" : ""}>${formatLabel(status)}</option>`;
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function renderDashboardChrome(input: DashboardShellInput & { body: string }): string {
  const activePath = normalizePath(input.activePath);
  const nav = NAV_ITEMS.map((item) => {
    const isActive = item.href === activePath;
    return `<a class="dashboard-nav-link" href="${item.href}"${isActive ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`;
  }).join("");

  return renderDashboardDocument({
    title: input.title,
    shellState: "authenticated",
    body: `
      <aside class="dashboard-sidebar">
        <a class="dashboard-brand" href="/dashboard" aria-label="AOHYS dashboard home">
          <span class="dashboard-brand-mark">AO</span>
          <span>AOHYS Ops</span>
        </a>
        <nav class="dashboard-nav" aria-label="Dashboard navigation">${nav}</nav>
      </aside>
      <main class="dashboard-main">
        <header class="dashboard-topbar">
          <div>
            <p class="dashboard-kicker">Private dashboard</p>
            <h1>${escapeHtml(input.title)}</h1>
          </div>
          <p class="dashboard-admin">${escapeHtml(input.adminEmail)}</p>
        </header>
        ${input.body}
      </main>
    `,
  });
}

export function renderDashboardState(state: DashboardState): string {
  const copy = STATE_COPY[state];

  return renderDashboardDocument({
    title: copy.title,
    shellState: state,
    body: `
      <main class="dashboard-state" data-dashboard-state="${state}">
        <p class="dashboard-kicker">${escapeHtml(copy.status)}</p>
        <h1>${escapeHtml(copy.title)}</h1>
        <p>${escapeHtml(copy.body)}</p>
        <a class="dashboard-action" href="/dashboard/sign-in">Return to sign in</a>
      </main>
    `,
  });
}

export function renderDashboardSignIn(input: DashboardSignInInput): string {
  return renderDashboardDocument({
    title: "Sign in to AOHYS dashboard",
    shellState: "sign-in",
    body: `
      <main class="dashboard-state" data-dashboard-surface="sign-in">
        <p class="dashboard-kicker">Private dashboard</p>
        <h1>Sign in to continue</h1>
        <p>Use the allowlisted AOHYS admin account to access private operations.</p>
        <a class="dashboard-action" href="${escapeHtml(input.signInUrl)}">Sign in with Google</a>
      </main>
    `,
  });
}

function renderWorkflowCard(title: string, body: string): string {
  return `
    <article class="dashboard-workflow-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function renderLeadWorkflowNotice(
  state: DashboardLeadWorkflowState,
  validationMessage?: string,
): string {
  switch (state) {
    case "save-success":
      return `<p class="dashboard-notice" role="status">Lead status saved. Refresh keeps the updated Convex state.</p>`;
    case "validation-error":
      return `<p class="dashboard-notice dashboard-notice-warning" role="alert">${escapeHtml(validationMessage ?? "Lead status could not be saved.")}</p>`;
    case "loading":
      return `<p class="dashboard-notice" role="status">Loading lead workflow...</p>`;
    case "save-pending":
      return `<p class="dashboard-notice" role="status">Saving lead status...</p>`;
    case "unauthorized":
      return `<p class="dashboard-notice dashboard-notice-warning" role="alert">Lead data is restricted to allowlisted admins.</p>`;
    case "configuration-error":
      return `<p class="dashboard-notice dashboard-notice-warning" role="alert">Lead workflow provider configuration needs attention.</p>`;
    default:
      return "";
  }
}

function renderLeadList(leads: DashboardLead[], selectedLeadId?: string): string {
  return `
    <div class="lead-list" aria-label="Incoming leads">
      ${leads.map((lead) => {
        const isSelected = lead.id === selectedLeadId;
        return `
          <a class="lead-list-item" href="/dashboard/leads?lead=${encodeURIComponent(lead.id)}"${isSelected ? ' aria-current="page"' : ""}>
            <span>
              <strong>${escapeHtml(lead.name)}</strong>
              <span>${escapeHtml(lead.email)}</span>
            </span>
            <span class="lead-status" data-status="${lead.status}">${formatLeadStatus(lead.status)}</span>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function renderLeadDetail(lead: DashboardLead): string {
  return `
    <article class="lead-detail" aria-labelledby="lead-detail-title">
      <div class="dashboard-section-heading">
        <p class="dashboard-kicker">Lead detail</p>
        <h2 id="lead-detail-title">${escapeHtml(lead.name)}</h2>
        <p>${escapeHtml(lead.intent)} from ${escapeHtml(lead.sourcePath)}</p>
      </div>
      <dl class="lead-metadata">
        ${renderLeadMeta("Email", lead.email)}
        ${renderLeadMeta("Company", lead.company)}
        ${renderLeadMeta("Phone", lead.phone)}
        ${renderLeadMeta("Preferred contact", lead.preferredContactPath)}
        ${renderLeadMeta("Locale", lead.locale)}
        ${renderLeadMeta("Current status", formatLeadStatus(lead.status))}
      </dl>
      <section class="lead-message" aria-label="Lead message">
        <h3>Message</h3>
        <p>${escapeHtml(lead.message)}</p>
      </section>
      <form class="lead-status-form" method="post" action="/dashboard/leads/status">
        <input type="hidden" name="leadId" value="${escapeHtml(lead.id)}" />
        <label for="lead-status-${escapeHtml(lead.id)}">Review status</label>
        <div class="lead-status-controls">
          <select id="lead-status-${escapeHtml(lead.id)}" name="status">
            ${renderStatusOption("new", lead.status)}
            ${renderStatusOption("reviewing", lead.status)}
            ${renderStatusOption("closed", lead.status)}
          </select>
          <button class="dashboard-action" type="submit">Save status</button>
        </div>
      </form>
    </article>
  `;
}

function renderLeadEmptyState(): string {
  return `
    <div class="lead-empty-state" data-workflow-state="empty">
      <h3>No leads yet</h3>
      <p>New contact submissions will appear here after Convex stores them.</p>
    </div>
  `;
}

function renderLeadPlaceholder(): string {
  return `
    <div class="lead-empty-state" data-workflow-state="empty">
      <h3>Select a lead</h3>
      <p>Choose a lead from the list to review contact details and status.</p>
    </div>
  `;
}

function renderLeadMeta(label: string, value: string | undefined): string {
  if (!value) {
    return "";
  }

  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderStatusOption(status: DashboardLeadStatus, selectedStatus: DashboardLeadStatus): string {
  return `<option value="${status}"${status === selectedStatus ? " selected" : ""}>${formatLeadStatus(status)}</option>`;
}

function formatLeadStatus(status: DashboardLeadStatus): string {
  switch (status) {
    case "reviewing":
      return "Reviewing";
    case "closed":
      return "Closed";
    default:
      return "New";
  }
}

function renderDashboardDocument(input: {
  title: string;
  shellState: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(input.title)} | AOHYS</title>
    <style>${DASHBOARD_CSS}</style>
  </head>
  <body>
    <div class="dashboard-shell" data-dashboard-shell="${input.shellState}">
      ${input.body}
    </div>
  </body>
</html>`;
}

function normalizePath(path: string): string {
  const [pathname = "/dashboard"] = path.split("?");
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const DASHBOARD_CSS = `
:root {
  color-scheme: light;
  --dashboard-bg: #f7faf9;
  --dashboard-panel: #ffffff;
  --dashboard-panel-subtle: #fbfdfc;
  --dashboard-ink: #16201d;
  --dashboard-muted: #5a6b66;
  --dashboard-line: #d9e5e1;
  --dashboard-accent: #1f7a6b;
  --dashboard-on-accent: #ffffff;
  --dashboard-accent-soft: #dff4ed;
  --dashboard-warning: #a35718;
  --dashboard-warning-soft: #fff3e7;
  --dashboard-info: #1767a3;
  --dashboard-info-soft: #eaf7ff;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-width: 320px;
  background: var(--dashboard-bg);
  color: var(--dashboard-ink);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
}
a { color: inherit; }
.dashboard-shell[data-dashboard-shell="authenticated"] {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
}
.dashboard-sidebar {
  border-inline-end: 1px solid var(--dashboard-line);
  background: var(--dashboard-panel-subtle);
  padding: 20px;
}
.dashboard-brand,
.dashboard-nav-link,
.dashboard-action {
  min-height: 44px;
}
.dashboard-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 760;
  text-decoration: none;
}
.dashboard-brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--dashboard-accent-soft);
  color: var(--dashboard-accent);
}
.dashboard-nav {
  display: grid;
  gap: 6px;
  margin-block-start: 28px;
}
.dashboard-nav-link {
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--dashboard-muted);
  text-decoration: none;
}
.dashboard-nav-link[aria-current="page"] {
  background: var(--dashboard-accent-soft);
  color: var(--dashboard-accent);
  font-weight: 700;
}
.dashboard-main {
  min-width: 0;
  padding: 24px;
}
.dashboard-topbar {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-block-end: 24px;
}
.dashboard-kicker {
  margin: 0 0 6px;
  color: var(--dashboard-muted);
  font-size: 0.78rem;
  font-weight: 750;
  letter-spacing: 0;
  text-transform: uppercase;
}
h1, h2, h3, p { margin-block-start: 0; }
h1 { margin-block-end: 0; font-size: 2.5rem; line-height: 1.04; }
h2 { margin-block-end: 8px; font-size: 1.25rem; }
h3 { margin-block-end: 8px; font-size: 1rem; }
.dashboard-admin {
  overflow-wrap: anywhere;
  color: var(--dashboard-muted);
  font-size: 0.92rem;
}
.dashboard-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
  gap: 20px;
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel);
  padding: 20px;
}
.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.dashboard-metrics div,
.dashboard-workflow-card {
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel-subtle);
  padding: 14px;
}
.dashboard-metrics span {
  display: block;
  color: var(--dashboard-muted);
  font-size: 0.78rem;
}
.dashboard-workflow-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-block-start: 14px;
}
.dashboard-state {
  width: min(560px, calc(100vw - 32px));
  margin: 10vh auto;
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel);
  padding: 24px;
}
.dashboard-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: var(--dashboard-accent);
  color: var(--dashboard-on-accent);
  padding: 10px 16px;
  font: inherit;
  font-weight: 750;
  text-decoration: none;
}
.dashboard-section-heading {
  margin-block-end: 16px;
}
.dashboard-section-heading p {
  color: var(--dashboard-muted);
}
.dashboard-notice {
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-accent-soft);
  color: var(--dashboard-accent);
  padding: 10px 12px;
}
.dashboard-notice-warning {
  background: var(--dashboard-warning-soft);
  color: var(--dashboard-warning);
}
.lead-workflow {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr);
  gap: 18px;
}
.lead-list-panel,
.lead-detail-panel {
  min-width: 0;
}
.lead-list {
  display: grid;
  gap: 10px;
}
.lead-list-item {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel);
  padding: 12px;
  text-decoration: none;
}
.lead-list-item span {
  display: grid;
  min-width: 0;
}
.lead-list-item span span,
.lead-detail p,
.lead-empty-state p,
.lead-message p {
  color: var(--dashboard-muted);
}
.lead-list-item[aria-current="page"] {
  border-color: var(--dashboard-accent);
  background: var(--dashboard-accent-soft);
}
.lead-status {
  width: max-content;
  border-radius: 999px;
  background: var(--dashboard-panel-subtle);
  color: var(--dashboard-muted);
  padding: 4px 9px;
  font-size: 0.78rem;
  font-weight: 750;
}
.lead-status[data-status="new"] {
  background: var(--dashboard-info-soft);
  color: var(--dashboard-info);
}
.lead-status[data-status="reviewing"] {
  background: var(--dashboard-warning-soft);
  color: var(--dashboard-warning);
}
.lead-status[data-status="closed"] {
  background: var(--dashboard-accent-soft);
  color: var(--dashboard-accent);
}
.lead-detail,
.lead-empty-state {
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel);
  padding: 18px;
}
.lead-metadata {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 18px;
}
.lead-metadata div {
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel-subtle);
  padding: 10px;
}
.lead-metadata dt {
  color: var(--dashboard-muted);
  font-size: 0.78rem;
}
.lead-metadata dd {
  margin: 2px 0 0;
  overflow-wrap: anywhere;
  font-weight: 700;
}
.lead-message {
  border-block-start: 1px solid var(--dashboard-line);
  padding-block-start: 16px;
}
.lead-status-form {
  display: grid;
  gap: 8px;
  margin-block-start: 18px;
}
.lead-status-form label {
  color: var(--dashboard-muted);
  font-size: 0.88rem;
  font-weight: 700;
}
.lead-status-controls {
  display: flex;
  gap: 10px;
}
.lead-status-controls select {
  min-height: 44px;
  min-width: 160px;
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel);
  color: var(--dashboard-ink);
  padding: 0 10px;
  font: inherit;
}
.content-workflow {
  display: grid;
  gap: 16px;
}
.content-panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.content-panel {
  min-width: 0;
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel);
  padding: 16px;
}
.content-list {
  display: grid;
  gap: 10px;
  margin-block-start: 12px;
}
.content-row,
.content-empty-state {
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel-subtle);
  padding: 12px;
}
.content-row {
  display: grid;
  gap: 12px;
}
.content-row strong,
.content-row span {
  display: block;
  overflow-wrap: anywhere;
}
.content-row span,
.content-empty-state {
  color: var(--dashboard-muted);
}
.content-form {
  display: grid;
  gap: 10px;
}
.content-create-form {
  border-block-start: 1px solid var(--dashboard-line);
  margin-block-start: 12px;
  padding-block-start: 12px;
}
.content-form label {
  display: grid;
  gap: 5px;
  color: var(--dashboard-muted);
  font-size: 0.88rem;
  font-weight: 700;
}
.content-form input,
.content-form select,
.content-form textarea {
  min-height: 44px;
  width: 100%;
  border: 1px solid var(--dashboard-line);
  border-radius: 8px;
  background: var(--dashboard-panel);
  color: var(--dashboard-ink);
  padding: 9px 10px;
  font: inherit;
}
.content-form textarea {
  resize: vertical;
}
@media (max-width: 720px) {
  .dashboard-shell[data-dashboard-shell="authenticated"] {
    display: block;
  }
  .dashboard-sidebar {
    border-inline-end: 0;
    border-block-end: 1px solid var(--dashboard-line);
  }
  .dashboard-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dashboard-main {
    padding: 18px;
  }
  h1 {
    font-size: 2rem;
  }
  .dashboard-topbar,
  .dashboard-overview,
  .dashboard-workflow-grid {
    display: block;
  }
  .dashboard-metrics {
    grid-template-columns: 1fr;
    margin-block-start: 16px;
  }
  .dashboard-workflow-card {
    margin-block-start: 12px;
  }
  .lead-workflow,
  .lead-metadata,
  .lead-status-controls,
  .content-panel-grid {
    display: block;
  }
  .lead-detail-panel {
    margin-block-start: 14px;
  }
  .content-panel {
    margin-block-start: 12px;
  }
  .lead-metadata div,
  .lead-status-controls .dashboard-action {
    margin-block-start: 10px;
  }
  .lead-status-controls select,
  .lead-status-controls .dashboard-action {
    width: 100%;
  }
}
`;
