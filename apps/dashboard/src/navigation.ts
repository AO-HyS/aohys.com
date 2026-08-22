export type DashboardRoutePath =
  | "/"
  | "/projects"
  | "/leads"
  | "/resume"
  | "/settings";
export type DashboardAliasPath = "/case-studies" | "/media";

export interface DashboardNavigationItem {
  id: "overview" | "projects" | "leads" | "resume" | "settings";
  path: DashboardRoutePath;
  aliases: readonly DashboardAliasPath[];
  label: string;
  description: string;
}

export const dashboardNavigation = [
  {
    id: "overview",
    path: "/",
    aliases: [],
    label: "Overview",
    description: "Operational readiness and the next trustworthy action.",
  },
  {
    id: "projects",
    path: "/projects",
    aliases: ["/case-studies", "/media"],
    label: "Projects",
    description: "Case studies, evidence media, drafts, and publication.",
  },
  {
    id: "leads",
    path: "/leads",
    aliases: [],
    label: "Leads",
    description: "Review contact requests and keep their status current.",
  },
  {
    id: "resume",
    path: "/resume",
    aliases: [],
    label: "Resume",
    description: "Maintain public hiring evidence and resume artifacts.",
  },
  {
    id: "settings",
    path: "/settings",
    aliases: [],
    label: "Settings",
    description: "Manage public contact and site-level configuration.",
  },
] as const satisfies readonly DashboardNavigationItem[];

export type DashboardNavigationId = (typeof dashboardNavigation)[number]["id"];

export function normalizeDashboardPath(path: string): string {
  const normalized = path.replace(/^\/dashboard\/?/, "/").split(/[?#]/, 1)[0];
  return normalized === "" ? "/" : normalized.replace(/\/$/, "") || "/";
}

export function findDashboardNavigationItem(
  path: string,
): DashboardNavigationItem {
  return matchDashboardNavigationItem(path) ?? dashboardNavigation[0];
}

export function matchDashboardNavigationItem(
  path: string,
): DashboardNavigationItem | undefined {
  const normalizedPath = normalizeDashboardPath(path);
  return dashboardNavigation.find(
    (item) =>
      item.path === normalizedPath ||
      (item.aliases as readonly string[]).includes(normalizedPath),
  );
}

export function isDashboardNavigationItemActive(
  path: string,
  item: DashboardNavigationItem,
): boolean {
  return findDashboardNavigationItem(path).id === item.id;
}
