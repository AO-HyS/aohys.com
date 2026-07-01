import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import {
  BriefcaseBusinessIcon,
  FileTextIcon,
  InboxIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardHome } from "@/screens/dashboard-home";
import { LeadsScreen } from "@/screens/leads-screen";
import { ProjectsScreen } from "@/screens/projects-screen";
import { ResumeScreen } from "@/screens/resume-screen";
import "./styles.css";

const runtimeConfig = window.__AOHYS_DASHBOARD__ ?? {
  adminEmail: "local@aohys.com",
  environment: "local" as const,
};

function AppLayout() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex lg:flex-col">
          <a className="flex items-center gap-3 text-sm font-semibold" href="/dashboard">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              AO
            </span>
            <span>AOHYS Dashboard</span>
          </a>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Dashboard navigation">
            <DashboardNavLink to="/projects" icon={<BriefcaseBusinessIcon data-icon="inline-start" />}>
              Projects
            </DashboardNavLink>
            <DashboardNavLink to="/leads" icon={<InboxIcon data-icon="inline-start" />}>
              Leads
            </DashboardNavLink>
            <DashboardNavLink to="/resume" icon={<FileTextIcon data-icon="inline-start" />}>
              Resume
            </DashboardNavLink>
            <DashboardNavLink to="/projects" hash="contact-settings" icon={<SettingsIcon data-icon="inline-start" />}>
              Contact
            </DashboardNavLink>
          </nav>
          <div className="mt-auto flex flex-col gap-3 text-xs text-muted-foreground">
            <div className="rounded-lg border bg-background px-3 py-2">
              <div className="font-medium text-foreground">{runtimeConfig.adminEmail}</div>
              <div>{runtimeConfig.environment}</div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/dashboard/sign-out">
                <LogOutIcon data-icon="inline-start" />
                Sign out
              </a>
            </Button>
          </div>
        </aside>
        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <a className="font-semibold" href="/dashboard">AOHYS Dashboard</a>
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/sign-out">Sign out</a>
              </Button>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto" aria-label="Mobile dashboard navigation">
              <MobileNavLink to="/projects">Projects</MobileNavLink>
              <MobileNavLink to="/leads">Leads</MobileNavLink>
              <MobileNavLink to="/resume">Resume</MobileNavLink>
            </nav>
          </header>
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DashboardNavLink({
  to,
  hash,
  icon,
  children,
}: {
  to: string;
  hash?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:font-medium [&.active]:text-sidebar-accent-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={to}>{children}</Link>
    </Button>
  );
}

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardHome,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsScreen,
});

const legacyCaseStudiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/case-studies",
  component: ProjectsScreen,
});

const legacyMediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media",
  component: ProjectsScreen,
});

const legacySettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: ProjectsScreen,
});

const leadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leads",
  component: LeadsScreen,
});

const resumeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resume",
  component: ResumeScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  legacyCaseStudiesRoute,
  legacyMediaRoute,
  legacySettingsRoute,
  leadsRoute,
  resumeRoute,
]);

const router = createRouter({
  basepath: "/dashboard",
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
