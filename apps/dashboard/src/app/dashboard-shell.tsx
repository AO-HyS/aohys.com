import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import { Action } from "@/components/dashboard/action";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  dashboardNavigation,
  findDashboardNavigationItem,
  isDashboardNavigationItemActive,
} from "@/app/navigation";
import { dashboardRuntimeConfig } from "@/runtime-config";

const runtimeConfig = dashboardRuntimeConfig;

function DashboardAppNav() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label="Dashboard navigation">
          {dashboardNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  isActive={isDashboardNavigationItemActive(path, item)}
                  tooltip={item.label}
                  className="h-11 data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-[color-mix(in_oklch,var(--sidebar-primary)_84%,white)] data-active:hover:text-sidebar-primary-foreground md:h-9"
                >
                  <Link to={item.path} onClick={() => setOpenMobile(false)}>
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function DashboardSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="AOHYS Operations Desk">
              <Link to="/" className="h-11" aria-label="AOHYS Operations Desk overview">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
                  AO
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <strong className="truncate text-sm font-semibold">Operations Desk</strong>
                  <span className="truncate text-xs text-sidebar-foreground/70">AOHYS publishing</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <DashboardAppNav />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <div className="flex min-w-0 flex-col gap-1 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <strong className="truncate text-xs font-medium">{runtimeConfig.adminEmail}</strong>
          <span className="text-xs text-sidebar-foreground/70">{runtimeConfig.environment} environment</span>
        </div>
        <Action asChild variant="secondary" className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0">
          <a href="/dashboard/sign-out">
            <LogOutIcon data-icon="inline-start" />
            <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
          </a>
        </Action>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function DashboardUtilityBar() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const currentItem = findDashboardNavigationItem(path);

  return (
    <header data-slot="dashboard-utility-bar" className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b bg-background px-3 sm:px-5">
      <SidebarTrigger className="size-11 md:size-8" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{currentItem.label}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{currentItem.description}</p>
      </div>
      <span className="hidden rounded-md border px-2 py-1 text-xs text-muted-foreground sm:inline-flex">
        {runtimeConfig.environment}
      </span>
    </header>
  );
}

export function DashboardShell() {
  return (
    <TooltipProvider>
      <SidebarProvider data-session-state="ready">
        <a
          className="fixed left-2 top-2 z-60 -translate-y-[160%] rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:translate-y-0 focus:outline-3 focus:outline-offset-2 focus:outline-ring"
          href="#dashboard-content"
        >
          Skip to dashboard content
        </a>
        <DashboardSidebar />
        <SidebarInset>
          <DashboardUtilityBar />
          <div id="dashboard-content" tabIndex={-1} className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}
