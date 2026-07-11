export type DashboardAccessState = "loading" | "unauthorized" | "configuration-error" | "unavailable";

const STATE_COPY: Record<DashboardAccessState, { title: string; body: string; status: string }> = {
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

const THEME_CLASS = [
  "[--background:oklch(1_0_0)] [--foreground:oklch(0.3649_0.0215_61.4)]",
  "[--card:oklch(1_0_0)] [--card-foreground:oklch(0.3649_0.0215_61.4)]",
  "[--primary:oklch(0.8623_0.129_80)] [--primary-foreground:oklch(0.275_0.024_61.4)]",
  "[--muted:oklch(0.965_0.006_61.4)] [--muted-foreground:oklch(0.475_0.026_61.4)]",
  "[--border:oklch(0.84_0.025_80)] [--ring:oklch(0.56_0.155_48)] [--radius:0.625rem]",
].join(" ");
const DOCUMENT_CLASS = `${THEME_CLASS} min-h-screen min-w-80 bg-background font-sans text-foreground [color-scheme:light]`;
const STATE_CLASS = "mx-auto mt-[10vh] w-[min(560px,calc(100vw-32px))] rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8";
const KICKER_CLASS = "mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const HEADING_CLASS = "m-0 text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-4xl";
const BODY_CLASS = "mt-4 max-w-[52ch] font-body leading-6 text-muted-foreground";
const ACTION_CLASS = "mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-foreground bg-primary px-4 py-2.5 font-semibold text-primary-foreground no-underline shadow-[0_3px_0_var(--foreground)]";

export function renderDashboardState(state: DashboardAccessState): string {
  const copy = STATE_COPY[state];
  return renderDocument(copy.title, state, `
    <main class="${STATE_CLASS}" data-dashboard-state="${state}">
      <p class="${KICKER_CLASS}">${escapeHtml(copy.status)}</p>
      <h1 class="${HEADING_CLASS}">${escapeHtml(copy.title)}</h1>
      <p class="${BODY_CLASS}">${escapeHtml(copy.body)}</p>
      <a class="${ACTION_CLASS}" href="/dashboard/sign-in">Return to sign in</a>
    </main>
  `);
}

export function renderDashboardSignIn(input: { signInUrl: string }): string {
  return renderDocument("Sign in to AOHYS dashboard", "sign-in", `
    <main class="${STATE_CLASS}" data-dashboard-surface="sign-in">
      <p class="${KICKER_CLASS}">Private Operations Desk</p>
      <h1 class="${HEADING_CLASS}">Sign in to continue</h1>
      <p class="${BODY_CLASS}">Use the allowlisted AOHYS admin account to access private operations.</p>
      <a class="${ACTION_CLASS}" href="${escapeHtml(input.signInUrl)}">Sign in with Google</a>
    </main>
  `);
}

function renderDocument(title: string, shellState: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(title)} | AOHYS</title>
    <link rel="stylesheet" href="/dashboard-app/assets/dashboard.css" />
  </head>
  <body class="${DOCUMENT_CLASS}">
    <div data-dashboard-shell="${escapeHtml(shellState)}">${body}</div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
