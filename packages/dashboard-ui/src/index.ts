export type DashboardState =
  | "loading"
  | "unauthorized"
  | "configuration-error"
  | "unavailable";

export interface DashboardShellInput {
  adminEmail: string;
  activePath: string;
  title: string;
}

export interface DashboardSignInInput {
  signInUrl: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/case-studies", label: "Case studies" },
  { href: "/dashboard/media", label: "Media" },
  { href: "/dashboard/settings", label: "Settings" },
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
  border-radius: 8px;
  background: var(--dashboard-accent);
  color: var(--dashboard-on-accent);
  padding: 10px 16px;
  font-weight: 750;
  text-decoration: none;
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
}
`;
