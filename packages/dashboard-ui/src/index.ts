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
  selectedForPublic?: boolean;
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
  { href: "/dashboard/settings", label: "Contact value" },
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
      <section class="${DASHBOARD_LEGACY_CLASS.overview}" data-dashboard-surface="overview" aria-labelledby="dashboard-overview-title">
        <div class="min-w-0">
          <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Today</p>
          <h2 id="dashboard-overview-title">Publishing room</h2>
          <p>Use this dashboard to keep the public site honest: review leads, connect project media to case studies, and check the public contact value that affects the Astro pages.</p>
        </div>
        <div class="${DASHBOARD_LEGACY_CLASS.releaseCard}" aria-label="Dashboard operating boundary">
          <span>Private surface</span>
          <strong>noindex · authenticated · preview aware</strong>
          <p>Public pages carry SEO. This dashboard carries operations.</p>
        </div>
      </section>
      <section class="${DASHBOARD_LEGACY_CLASS.workflowGrid}" aria-label="Dashboard workflows">
        ${renderWorkflowCard("/dashboard/leads", "Lead inbox", "Reply while the context is fresh.")}
        ${renderWorkflowCard("/dashboard/case-studies", "Project pages", "Check each public page has a link, status, and safe media.")}
        ${renderWorkflowCard("/dashboard/media", "Media queue", "Track screenshots, alt text, Cloudflare keys, and where each asset appears.")}
        ${renderWorkflowCard("/dashboard/settings", "Site settings", "Review public values such as contact paths, provider outputs, and policy text.")}
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
      <section class="${DASHBOARD_LEGACY_CLASS.leadWorkflow}" data-dashboard-surface="lead-workflow" data-workflow-state="${workflowState}" aria-labelledby="lead-workflow-title">
        <div class="${DASHBOARD_LEGACY_CLASS.leadPanel}">
          <div class="${DASHBOARD_LEGACY_CLASS.sectionHeading}">
            <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Lead review</p>
            <h2 id="lead-workflow-title">Incoming leads</h2>
            <p>${input.leads.length} lead${input.leads.length === 1 ? "" : "s"} ready for review.</p>
          </div>
          ${renderLeadWorkflowNotice(workflowState, input.validationMessage)}
          ${input.leads.length > 0 ? renderLeadList(input.leads, selectedLead?.id) : renderLeadEmptyState()}
        </div>
        <div class="${DASHBOARD_LEGACY_CLASS.leadDetailPanel}">
          ${selectedLead ? renderLeadDetail(selectedLead) : renderLeadPlaceholder()}
        </div>
      </section>
    `,
  });
}

export function renderDashboardContentWorkflow(input: DashboardContentWorkflowInput): string {
  const itemCount = input.caseStudies.length + input.media.length + input.settings.length + input.resumeVersions.length;
  const workflowState = input.workflowState ?? (itemCount > 0 ? "ready" : "empty");
  const surface = contentSurfaceForPath(input.activePath);

  return renderDashboardChrome({
    ...input,
    body: `
      <section class="${DASHBOARD_LEGACY_CLASS.contentWorkflow}" data-dashboard-surface="content-workflow" data-content-surface="${surface.id}" data-workflow-state="${workflowState}" aria-labelledby="content-workflow-title">
        <div class="${DASHBOARD_LEGACY_CLASS.sectionHeading}">
          <p class="${DASHBOARD_LEGACY_CLASS.kicker}">${escapeHtml(surface.kicker)}</p>
          <h2 id="content-workflow-title">${escapeHtml(surface.title)}</h2>
          <p>${escapeHtml(surface.body)}</p>
        </div>
        ${renderContentWorkflowNotice(workflowState, input.validationMessage)}
        ${renderContentSurface(input, surface.id)}
      </section>
    `,
  });
}

type DashboardContentSurfaceId = "case-studies" | "media" | "settings" | "resume";

interface DashboardContentSurface {
  id: DashboardContentSurfaceId;
  kicker: string;
  title: string;
  body: string;
}

function contentSurfaceForPath(path: string): DashboardContentSurface {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/dashboard/media") {
    return {
      id: "media",
      kicker: "Project media",
      title: "Media queue",
      body: "Register screenshots, generated images, alt text, storage keys, and the public content node each asset supports.",
    };
  }

  if (normalizedPath === "/dashboard/settings") {
    return {
      id: "settings",
      kicker: "Runtime values",
      title: "Site settings",
      body: "Keep public values explicit: contact paths, provider outputs, policy values, and environment-specific settings.",
    };
  }

  if (normalizedPath === "/dashboard/resume") {
    return {
      id: "resume",
      kicker: "Hiring surface",
      title: "Resume versions",
      body: "Track downloadable resume artifacts and keep the dynamic resume page aligned with the public content graph.",
    };
  }

  return {
    id: "case-studies",
    kicker: "Public pages",
    title: "Project pages",
    body: "Review the pages that sell the work: status, localized routes, sitemap visibility, and the public link or media that is safe to show.",
  };
}

function renderContentSurface(
  input: DashboardContentWorkflowInput,
  surfaceId: DashboardContentSurfaceId,
): string {
  switch (surfaceId) {
    case "media":
      return `
        <div class="${DASHBOARD_LEGACY_CLASS.contentWorkspace}">
          ${renderMediaPanel(input.media, input.caseStudies)}
          ${renderCaseStudyReferencePanel(input.caseStudies)}
        </div>
      `;
    case "settings":
      return `
        <div class="${DASHBOARD_LEGACY_CLASS.contentWorkspace}">
          ${renderSettingsPanel(input.settings)}
          ${renderSiteBoundaryPanel()}
        </div>
      `;
    case "resume":
      return `
        <div class="${DASHBOARD_LEGACY_CLASS.contentWorkspace}">
          ${renderResumePanel(input.resumeVersions)}
          ${renderResumeContextPanel()}
        </div>
      `;
    default:
      return `
        <div class="${DASHBOARD_LEGACY_CLASS.contentWorkspace} ${DASHBOARD_LEGACY_CLASS.contentWorkspaceCaseStudies}">
          ${renderCaseStudyPanel(input.caseStudies)}
          ${renderMediaReferencePanel(input.media)}
        </div>
      `;
  }
}

function renderContentWorkflowNotice(
  state: DashboardContentWorkflowState,
  validationMessage?: string,
): string {
  switch (state) {
    case "save-success":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice}" role="status">Content metadata saved. Public pages still render through the Public Content Graph.</p>`;
    case "validation-error":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice} ${DASHBOARD_LEGACY_CLASS.noticeWarning}" role="alert">${escapeHtml(validationMessage ?? "Content metadata could not be saved.")}</p>`;
    case "loading":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice}" role="status">Loading content workflow...</p>`;
    case "save-pending":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice}" role="status">Saving content metadata...</p>`;
    case "unauthorized":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice} ${DASHBOARD_LEGACY_CLASS.noticeWarning}" role="alert">Content workflows are restricted to allowlisted admins.</p>`;
    case "environment-unavailable":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice} ${DASHBOARD_LEGACY_CLASS.noticeWarning}" role="alert">Content workflows are unavailable until the Environment Contract is complete.</p>`;
    case "configuration-error":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice} ${DASHBOARD_LEGACY_CLASS.noticeWarning}" role="alert">Content workflow provider configuration needs attention.</p>`;
    case "empty":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice}" role="status">No content metadata exists yet. Public graph nodes still define the published surface.</p>`;
    default:
      return "";
  }
}

function renderCaseStudyPanel(caseStudies: DashboardCaseStudyMetadata[]): string {
  return `
    <article class="${DASHBOARD_LEGACY_CLASS.contentPanel}" aria-labelledby="content-case-studies-title">
      <div>
        <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Case studies</p>
        <h3 id="content-case-studies-title">Public graph metadata</h3>
      </div>
      <div class="${DASHBOARD_LEGACY_CLASS.contentList}">
        ${caseStudies.length > 0 ? caseStudies.map(renderCaseStudyRow).join("") : renderContentEmptyState("No case-study metadata yet.")}
      </div>
    </article>
  `;
}

function renderCaseStudyRow(caseStudy: DashboardCaseStudyMetadata): string {
  return `
    <section class="${DASHBOARD_LEGACY_CLASS.contentRow}">
      <div>
        <strong>${escapeHtml(caseStudy.title)}</strong>
        <span>${escapeHtml(caseStudy.contentId)}</span>
        <span>${escapeHtml(caseStudy.englishPath)} · ${escapeHtml(caseStudy.spanishPath)}</span>
        <span>${caseStudy.sitemapIncluded ? "Sitemap eligible" : "Noindex protected"}</span>
      </div>
      <form class="${DASHBOARD_LEGACY_CLASS.contentForm}" method="post" action="/dashboard/content/case-study">
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
          <span>Public link state</span>
          <select name="evidenceStatus">
            ${renderEvidenceStatusOption("missing", caseStudy.evidenceStatus)}
            ${renderEvidenceStatusOption("sanitized", caseStudy.evidenceStatus)}
            ${renderEvidenceStatusOption("published", caseStudy.evidenceStatus)}
          </select>
        </label>
        <button class="${DASHBOARD_LEGACY_CLASS.action}" type="submit">Save metadata</button>
      </form>
    </section>
  `;
}

function renderCaseStudyReferencePanel(caseStudies: DashboardCaseStudyMetadata[]): string {
  return `
    <aside class="${DASHBOARD_LEGACY_CLASS.contentSidePanel}" aria-labelledby="media-case-map-title">
      <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Where media lands</p>
      <h3 id="media-case-map-title">Case-study map</h3>
      <p>Attach every screenshot or generated asset to one public content ID. Assets without a content ID should stay draft.</p>
      <div class="${DASHBOARD_LEGACY_CLASS.contentList}">
        ${caseStudies.length > 0 ? caseStudies.map((caseStudy) => `
          <a class="${DASHBOARD_LEGACY_CLASS.contentReferenceLink}" href="${escapeHtml(caseStudy.englishPath)}">
            <strong>${escapeHtml(caseStudy.title)}</strong>
            <span>${escapeHtml(caseStudy.contentId)} · ${formatLabel(caseStudy.evidenceStatus)}</span>
          </a>
        `).join("") : renderContentEmptyState("No case-study routes available.")}
      </div>
    </aside>
  `;
}

function renderMediaPanel(
  mediaItems: DashboardMediaMetadata[],
  caseStudies: DashboardCaseStudyMetadata[],
): string {
  return `
    <article class="${DASHBOARD_LEGACY_CLASS.contentPanel}" aria-labelledby="content-media-title">
      <div>
        <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Media</p>
        <h3 id="content-media-title">Metadata and safety</h3>
      </div>
      <form class="${DASHBOARD_LEGACY_CLASS.contentForm} ${DASHBOARD_LEGACY_CLASS.contentCreateForm}" method="post" action="/dashboard/content/media">
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
        <button class="${DASHBOARD_LEGACY_CLASS.action}" type="submit">Add media metadata</button>
      </form>
      <div class="${DASHBOARD_LEGACY_CLASS.contentList}">
        ${mediaItems.length > 0 ? mediaItems.map(renderMediaRow).join("") : renderContentEmptyState("No media metadata yet.")}
      </div>
    </article>
  `;
}

function renderMediaReferencePanel(mediaItems: DashboardMediaMetadata[]): string {
  const publishedMedia = mediaItems.filter((media) => media.status === "published").length;
  const draftMedia = mediaItems.filter((media) => media.status === "draft").length;

  return `
    <aside class="${DASHBOARD_LEGACY_CLASS.contentSidePanel}" aria-labelledby="case-media-status-title">
      <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Asset health</p>
      <h3 id="case-media-status-title">Project media status</h3>
      <p>Case-study pages should not reuse the same weak screenshot. Prefer one strong asset per case, with clear alt text and a content ID.</p>
      <div class="${DASHBOARD_LEGACY_CLASS.miniLedger}">
        <div><span>Published</span><strong>${publishedMedia}</strong></div>
        <div><span>Draft</span><strong>${draftMedia}</strong></div>
        <div><span>Total</span><strong>${mediaItems.length}</strong></div>
      </div>
    </aside>
  `;
}

function renderMediaRow(media: DashboardMediaMetadata): string {
  return `
    <section class="${DASHBOARD_LEGACY_CLASS.contentRow}">
      <div>
        <strong>${escapeHtml(media.storageKey)}</strong>
        <span>${formatLabel(media.storageProvider)} · ${formatLabel(media.usage)} · ${formatLabel(media.status)}</span>
        <span>${escapeHtml(media.altText)}</span>
        ${media.contentId ? `<span>${escapeHtml(media.contentId)}</span>` : ""}
      </div>
    </section>
  `;
}

function renderSiteBoundaryPanel(): string {
  return `
    <aside class="${DASHBOARD_LEGACY_CLASS.contentSidePanel}" aria-labelledby="settings-boundary-title">
      <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Boundary</p>
      <h3 id="settings-boundary-title">What belongs here</h3>
      <p>Use settings for values the public site needs to render correctly. Secrets and provider credentials belong in the Environment Contract, not in content settings.</p>
      <div class="${DASHBOARD_LEGACY_CLASS.checkList}">
        <span>Contact URLs are public build values.</span>
        <span>Provider outputs are safe summaries only.</span>
        <span>Policy values affect visible public copy.</span>
      </div>
    </aside>
  `;
}

function renderSettingsPanel(settings: DashboardSiteSetting[]): string {
  return `
    <article class="${DASHBOARD_LEGACY_CLASS.contentPanel}" aria-labelledby="content-settings-title">
      <div>
        <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Settings</p>
        <h3 id="content-settings-title">Public-safe values</h3>
      </div>
      <form class="${DASHBOARD_LEGACY_CLASS.contentForm} ${DASHBOARD_LEGACY_CLASS.contentCreateForm}" method="post" action="/dashboard/content/setting">
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
        <button class="${DASHBOARD_LEGACY_CLASS.action}" type="submit">Save setting</button>
      </form>
      <div class="${DASHBOARD_LEGACY_CLASS.contentList}">
        ${settings.length > 0 ? settings.map(renderSettingRow).join("") : renderContentEmptyState("No dashboard-managed settings yet.")}
      </div>
    </article>
  `;
}

function renderSettingRow(setting: DashboardSiteSetting): string {
  return `
    <section class="${DASHBOARD_LEGACY_CLASS.contentRow}">
      <div>
        <strong>${escapeHtml(setting.key)}</strong>
        <span>${escapeHtml(setting.environment)} · ${formatLabel(setting.classification)}</span>
        <span>${escapeHtml(setting.value)}</span>
      </div>
    </section>
  `;
}

function renderResumeContextPanel(): string {
  return `
    <aside class="${DASHBOARD_LEGACY_CLASS.contentSidePanel}" aria-labelledby="resume-boundary-title">
      <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Publishing rule</p>
      <h3 id="resume-boundary-title">Resume stays readable</h3>
      <p>The dynamic resume can show context and links. The PDF should stay compact, plain, parseable, and easy for a hiring manager to scan.</p>
      <div class="${DASHBOARD_LEGACY_CLASS.checkList}">
        <span>One current English PDF artifact.</span>
        <span>Spanish route remains a readable public page.</span>
        <span>Private project details stay out of both.</span>
      </div>
    </aside>
  `;
}

function renderResumePanel(resumeVersions: DashboardResumeVersion[]): string {
  return `
    <article class="${DASHBOARD_LEGACY_CLASS.contentPanel}" aria-labelledby="content-resume-title">
      <div>
        <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Resume</p>
        <h3 id="content-resume-title">Version alignment</h3>
      </div>
      <form class="${DASHBOARD_LEGACY_CLASS.contentForm} ${DASHBOARD_LEGACY_CLASS.contentCreateForm}" method="post" action="/dashboard/content/resume">
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
        <button class="${DASHBOARD_LEGACY_CLASS.action}" type="submit">Add resume version</button>
      </form>
      <div class="${DASHBOARD_LEGACY_CLASS.contentList}">
        ${resumeVersions.length > 0 ? resumeVersions.map(renderResumeVersionRow).join("") : renderContentEmptyState("No resume versions yet.")}
      </div>
    </article>
  `;
}

function renderResumeVersionRow(resumeVersion: DashboardResumeVersion): string {
  return `
    <section class="${DASHBOARD_LEGACY_CLASS.contentRow}">
      <div>
        <strong>${escapeHtml(resumeVersion.version)}</strong>
        <span>${escapeHtml(resumeVersion.locale)} · ${resumeVersion.isPublished ? "Published" : "Draft"}</span>
        <span>${escapeHtml(resumeVersion.pdfPath)}</span>
      </div>
    </section>
  `;
}

function renderContentEmptyState(message: string): string {
  return `<p class="${DASHBOARD_LEGACY_CLASS.contentEmptyState}">${escapeHtml(message)}</p>`;
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
    return `<a class="${DASHBOARD_LEGACY_CLASS.navLink}" href="${item.href}"${isActive ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`;
  }).join("");

  return renderDashboardDocument({
    title: input.title,
    shellState: "authenticated",
    body: `
      <aside class="${DASHBOARD_LEGACY_CLASS.sidebar}">
        <a class="${DASHBOARD_LEGACY_CLASS.brand}" href="/dashboard" aria-label="AOHYS dashboard home">
          <span class="${DASHBOARD_LEGACY_CLASS.brandMark}">AO</span>
          <span>AOHYS Ops</span>
        </a>
        <nav class="${DASHBOARD_LEGACY_CLASS.nav}" aria-label="Dashboard navigation">${nav}</nav>
      </aside>
      <main class="${DASHBOARD_LEGACY_CLASS.main}">
        <header class="${DASHBOARD_LEGACY_CLASS.topbar}">
          <div>
            <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Private dashboard</p>
            <h1>${escapeHtml(input.title)}</h1>
          </div>
          <div class="${DASHBOARD_LEGACY_CLASS.topbarActions}" aria-label="Dashboard actions">
            <p class="${DASHBOARD_LEGACY_CLASS.admin}">${escapeHtml(input.adminEmail)}</p>
            <a class="${DASHBOARD_LEGACY_CLASS.linkAction}" href="/">View site</a>
            <a class="${DASHBOARD_LEGACY_CLASS.linkAction}" href="/case-studies">Public work</a>
            <a class="${DASHBOARD_LEGACY_CLASS.action} ${DASHBOARD_LEGACY_CLASS.actionSecondary}" href="/dashboard/sign-out">Sign out</a>
          </div>
        </header>
        ${input.body}
      </main>
    `,
  });
}

const DASHBOARD_STYLESHEET_PATH = "/dashboard-app/assets/dashboard.css";
const DASHBOARD_THEME_CLASS = [
  "[--background:oklch(0.978_0.006_235)] [--foreground:oklch(0.17_0.035_242)]",
  "[--card:oklch(1_0_0)] [--card-foreground:oklch(0.17_0.035_242)]",
  "[--primary:oklch(0.44_0.13_170)] [--primary-foreground:oklch(0.99_0.01_170)]",
  "[--secondary:oklch(0.93_0.025_205)] [--secondary-foreground:oklch(0.22_0.055_232)]",
  "[--muted:oklch(0.94_0.01_232)] [--muted-foreground:oklch(0.38_0.038_238)]",
  "[--accent:oklch(0.78_0.14_78)] [--accent-foreground:oklch(0.19_0.045_68)]",
  "[--destructive:oklch(0.58_0.2_28)] [--border:oklch(0.84_0.012_235)]",
  "[--input:oklch(0.84_0.012_235)] [--ring:oklch(0.48_0.12_170)] [--radius:0.625rem]",
].join(" ");
const DASHBOARD_DOCUMENT_CLASS = `${DASHBOARD_THEME_CLASS} min-h-screen min-w-80 bg-background text-foreground font-sans [color-scheme:light]`;
const DASHBOARD_STATE_CLASS = "mx-auto mt-[10vh] w-[min(560px,calc(100vw-32px))] rounded-lg border border-border bg-card p-6 text-card-foreground";
const DASHBOARD_KICKER_CLASS = "mb-1.5 text-[0.78rem] font-[750] uppercase tracking-normal text-muted-foreground";
const DASHBOARD_HEADING_CLASS = "mb-0 text-[2.5rem] leading-[1.04] text-foreground max-[720px]:text-3xl";
const DASHBOARD_BODY_CLASS = "mt-4 text-muted-foreground";
const DASHBOARD_ACTION_CLASS = "mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-[750] text-primary-foreground no-underline";
const DASHBOARD_LEGACY_CLASS = {
  authenticatedShell: "min-h-screen grid grid-cols-[240px_minmax(0,1fr)] max-[720px]:block",
  sidebar: "border-r border-border bg-muted p-5 max-[720px]:border-r-0 max-[720px]:border-b",
  brand: "flex min-h-11 items-center gap-2.5 font-[760] no-underline",
  brandMark: "grid size-9 place-items-center rounded-lg bg-primary/10 text-primary",
  nav: "mt-7 grid gap-1.5 max-[720px]:grid-cols-2",
  navLink: "flex min-h-11 items-center rounded-lg px-3 py-2.5 text-muted-foreground no-underline aria-[current=page]:bg-primary/10 aria-[current=page]:font-bold aria-[current=page]:text-primary",
  main: "mx-auto w-[min(100%,1240px)] min-w-0 p-6 max-[720px]:p-[18px]",
  topbar: "mb-6 flex min-w-0 items-start justify-between gap-4 max-[720px]:block",
  kicker: DASHBOARD_KICKER_CLASS,
  admin: "[overflow-wrap:anywhere] text-[0.92rem] text-muted-foreground",
  topbarActions: "flex flex-wrap items-center justify-end gap-2 max-[720px]:mt-3 max-[720px]:justify-start",
  linkAction: "inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 py-2 font-bold no-underline hover:border-primary",
  action: "inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-[750] text-primary-foreground no-underline",
  actionSecondary: "border border-border !bg-card !text-foreground",
  overview: "grid grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)] gap-5 rounded-lg border border-border bg-card p-5 max-[720px]:block",
  releaseCard: "rounded-lg border border-border bg-muted p-3.5 [&_p]:mt-2 [&_p]:mb-0 [&_p]:text-muted-foreground [&_span]:block [&_span]:text-[0.78rem] [&_span]:font-[750] [&_span]:text-muted-foreground",
  workflowGrid: "mt-3.5 grid grid-cols-4 gap-3.5 max-[720px]:block",
  workflowCard: "rounded-lg border border-border bg-muted p-3.5 no-underline hover:border-primary max-[720px]:mt-3",
  sectionHeading: "mb-4 [&_p]:text-muted-foreground",
  notice: "rounded-lg border border-border bg-primary/10 px-3 py-2.5 text-primary",
  noticeWarning: "bg-accent/20 text-accent-foreground",
  leadWorkflow: "grid grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] gap-[18px] max-[720px]:block",
  leadPanel: "min-w-0",
  leadDetailPanel: "min-w-0 max-[720px]:mt-3.5",
  leadList: "grid gap-2.5",
  leadListItem: "flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 no-underline aria-[current=page]:border-primary aria-[current=page]:bg-primary/10 [&>span]:grid [&>span]:min-w-0 [&_span_span]:text-muted-foreground",
  leadStatus: "w-max rounded-full bg-muted px-[9px] py-1 text-[0.78rem] font-[750] text-muted-foreground data-[status=closed]:bg-primary/10 data-[status=closed]:text-primary data-[status=new]:bg-[oklch(0.94_0.04_230)] data-[status=new]:text-[oklch(0.46_0.11_235)] data-[status=reviewing]:bg-[oklch(0.95_0.05_72)] data-[status=reviewing]:text-[oklch(0.48_0.115_55)]",
  leadDetail: "rounded-lg border border-border bg-card p-[18px] [&_p]:text-muted-foreground",
  leadEmptyState: "rounded-lg border border-border bg-card p-[18px] [&_p]:text-muted-foreground",
  leadMetadata: "mb-[18px] grid grid-cols-2 gap-3 max-[720px]:block [&_div]:rounded-lg [&_div]:border [&_div]:border-border [&_div]:bg-muted [&_div]:p-2.5 max-[720px]:[&_div]:mt-2.5 [&_dt]:text-[0.78rem] [&_dt]:text-muted-foreground [&_dd]:mt-0.5 [&_dd]:mb-0 [&_dd]:[overflow-wrap:anywhere] [&_dd]:font-bold",
  leadMessage: "border-t border-border pt-4 [&_p]:text-muted-foreground",
  leadStatusForm: "mt-[18px] grid gap-2 [&_label]:text-[0.88rem] [&_label]:font-bold [&_label]:text-muted-foreground",
  leadStatusControls: "flex gap-2.5 max-[720px]:block [&_select]:min-h-11 [&_select]:min-w-40 [&_select]:rounded-lg [&_select]:border [&_select]:border-border [&_select]:bg-card [&_select]:px-2.5 [&_select]:font-[inherit] max-[720px]:[&_select]:w-full max-[720px]:[&_button]:mt-2.5",
  contentWorkflow: "grid gap-4",
  contentWorkspace: "grid grid-cols-[minmax(0,1fr)_minmax(260px,0.34fr)] items-start gap-4 max-[720px]:block",
  contentWorkspaceCaseStudies: "grid-cols-[minmax(0,1.12fr)_minmax(260px,0.32fr)]",
  contentPanelGrid: "grid grid-cols-2 gap-4 max-[720px]:block",
  contentPanel: "min-w-0 rounded-lg border border-border bg-card p-4 max-[720px]:mt-3",
  contentSidePanel: "sticky top-[18px] min-w-0 rounded-lg border border-border bg-card p-4 max-[720px]:static max-[720px]:mt-3",
  contentList: "mt-3 grid gap-2.5",
  contentRow: "grid gap-3 rounded-lg border border-border bg-muted p-3 [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_span]:block [&_span]:[overflow-wrap:anywhere] [&_span]:text-muted-foreground",
  contentEmptyState: "rounded-lg border border-border bg-muted p-3 text-muted-foreground",
  contentReferenceLink: "grid gap-1 rounded-lg border border-border bg-muted p-3 no-underline [&_span]:text-[0.86rem] [&_span]:text-muted-foreground",
  miniLedger: "mt-3 grid grid-cols-3 gap-2 [&_div]:rounded-lg [&_div]:border [&_div]:border-border [&_div]:bg-muted [&_div]:p-2.5 [&_span]:block [&_span]:text-[0.78rem] [&_span]:font-[750] [&_span]:text-muted-foreground [&_strong]:mt-0.5 [&_strong]:block [&_strong]:text-[1.4rem]",
  checkList: "mt-3 grid gap-2 text-muted-foreground [&_span]:rounded-lg [&_span]:border [&_span]:border-border [&_span]:bg-muted [&_span]:p-2.5",
  contentForm: "grid gap-2.5 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[0.88rem] [&_label]:font-bold [&_label]:text-muted-foreground [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-border [&_input]:bg-card [&_input]:px-2.5 [&_input]:py-[9px] [&_input]:font-[inherit] [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-border [&_select]:bg-card [&_select]:px-2.5 [&_select]:py-[9px] [&_select]:font-[inherit] [&_textarea]:min-h-11 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-border [&_textarea]:bg-card [&_textarea]:px-2.5 [&_textarea]:py-[9px] [&_textarea]:font-[inherit]",
  contentCreateForm: "mt-3 border-t border-border pt-3",
};

export function renderDashboardState(state: DashboardState): string {
  const copy = STATE_COPY[state];

  return renderDashboardDocument({
    title: copy.title,
    shellState: state,
    body: `
      <main class="${DASHBOARD_STATE_CLASS}" data-dashboard-state="${state}">
        <p class="${DASHBOARD_KICKER_CLASS}">${escapeHtml(copy.status)}</p>
        <h1 class="${DASHBOARD_HEADING_CLASS}">${escapeHtml(copy.title)}</h1>
        <p class="${DASHBOARD_BODY_CLASS}">${escapeHtml(copy.body)}</p>
        <a class="${DASHBOARD_ACTION_CLASS}" href="/dashboard/sign-in">Return to sign in</a>
      </main>
    `,
  });
}

export function renderDashboardSignIn(input: DashboardSignInInput): string {
  return renderDashboardDocument({
    title: "Sign in to AOHYS dashboard",
    shellState: "sign-in",
    body: `
      <main class="${DASHBOARD_STATE_CLASS}" data-dashboard-surface="sign-in">
        <p class="${DASHBOARD_KICKER_CLASS}">Private dashboard</p>
        <h1 class="${DASHBOARD_HEADING_CLASS}">Sign in to continue</h1>
        <p class="${DASHBOARD_BODY_CLASS}">Use the allowlisted AOHYS admin account to access private operations.</p>
        <a class="${DASHBOARD_ACTION_CLASS}" href="${escapeHtml(input.signInUrl)}">Sign in with Google</a>
      </main>
    `,
  });
}

function renderWorkflowCard(href: string, title: string, body: string): string {
  return `
    <a class="${DASHBOARD_LEGACY_CLASS.workflowCard}" href="${escapeHtml(href)}">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </a>
  `;
}

function renderLeadWorkflowNotice(
  state: DashboardLeadWorkflowState,
  validationMessage?: string,
): string {
  switch (state) {
    case "save-success":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice}" role="status">Lead status saved. Refresh keeps the updated Convex state.</p>`;
    case "validation-error":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice} ${DASHBOARD_LEGACY_CLASS.noticeWarning}" role="alert">${escapeHtml(validationMessage ?? "Lead status could not be saved.")}</p>`;
    case "loading":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice}" role="status">Loading lead workflow...</p>`;
    case "save-pending":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice}" role="status">Saving lead status...</p>`;
    case "unauthorized":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice} ${DASHBOARD_LEGACY_CLASS.noticeWarning}" role="alert">Lead data is restricted to allowlisted admins.</p>`;
    case "configuration-error":
      return `<p class="${DASHBOARD_LEGACY_CLASS.notice} ${DASHBOARD_LEGACY_CLASS.noticeWarning}" role="alert">Lead workflow provider configuration needs attention.</p>`;
    default:
      return "";
  }
}

function renderLeadList(leads: DashboardLead[], selectedLeadId?: string): string {
  return `
    <div class="${DASHBOARD_LEGACY_CLASS.leadList}" aria-label="Incoming leads">
      ${leads.map((lead) => {
        const isSelected = lead.id === selectedLeadId;
        return `
          <a class="${DASHBOARD_LEGACY_CLASS.leadListItem}" href="/dashboard/leads?lead=${encodeURIComponent(lead.id)}"${isSelected ? ' aria-current="page"' : ""}>
            <span>
              <strong>${escapeHtml(lead.name)}</strong>
              <span>${escapeHtml(lead.email)}</span>
            </span>
            <span class="${DASHBOARD_LEGACY_CLASS.leadStatus}" data-status="${lead.status}">${formatLeadStatus(lead.status)}</span>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function renderLeadDetail(lead: DashboardLead): string {
  return `
    <article class="${DASHBOARD_LEGACY_CLASS.leadDetail}" aria-labelledby="lead-detail-title">
      <div class="${DASHBOARD_LEGACY_CLASS.sectionHeading}">
        <p class="${DASHBOARD_LEGACY_CLASS.kicker}">Lead detail</p>
        <h2 id="lead-detail-title">${escapeHtml(lead.name)}</h2>
        <p>${escapeHtml(lead.intent)} from ${escapeHtml(lead.sourcePath)}</p>
      </div>
      <dl class="${DASHBOARD_LEGACY_CLASS.leadMetadata}">
        ${renderLeadMeta("Email", lead.email)}
        ${renderLeadMeta("Company", lead.company)}
        ${renderLeadMeta("Phone", lead.phone)}
        ${renderLeadMeta("Preferred contact", lead.preferredContactPath)}
        ${renderLeadMeta("Locale", lead.locale)}
        ${renderLeadMeta("Current status", formatLeadStatus(lead.status))}
      </dl>
      <section class="${DASHBOARD_LEGACY_CLASS.leadMessage}" aria-label="Lead message">
        <h3>Message</h3>
        <p>${escapeHtml(lead.message)}</p>
      </section>
      <form class="${DASHBOARD_LEGACY_CLASS.leadStatusForm}" method="post" action="/dashboard/leads/status">
        <input type="hidden" name="leadId" value="${escapeHtml(lead.id)}" />
        <label for="lead-status-${escapeHtml(lead.id)}">Review status</label>
        <div class="${DASHBOARD_LEGACY_CLASS.leadStatusControls}">
          <select id="lead-status-${escapeHtml(lead.id)}" name="status">
            ${renderStatusOption("new", lead.status)}
            ${renderStatusOption("reviewing", lead.status)}
            ${renderStatusOption("closed", lead.status)}
          </select>
          <button class="${DASHBOARD_LEGACY_CLASS.action}" type="submit">Save status</button>
        </div>
      </form>
    </article>
  `;
}

function renderLeadEmptyState(): string {
  return `
    <div class="${DASHBOARD_LEGACY_CLASS.leadEmptyState}" data-workflow-state="empty">
      <h3>No leads yet</h3>
      <p>New contact submissions will appear here after Convex stores them.</p>
    </div>
  `;
}

function renderLeadPlaceholder(): string {
  return `
    <div class="${DASHBOARD_LEGACY_CLASS.leadEmptyState}" data-workflow-state="empty">
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
    <link rel="stylesheet" href="${DASHBOARD_STYLESHEET_PATH}" />
  </head>
  <body class="${DASHBOARD_DOCUMENT_CLASS}">
    <div class="${input.shellState === "authenticated" ? DASHBOARD_LEGACY_CLASS.authenticatedShell : ""}" data-dashboard-shell="${input.shellState}">
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
