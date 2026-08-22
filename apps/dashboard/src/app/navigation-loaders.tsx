import type { ComponentType } from "react";
import { lazyRouteComponent } from "@tanstack/react-router";
import {
  BriefcaseBusinessIcon,
  FileTextIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SettingsIcon,
} from "lucide-react";
import type { DashboardNavigationId } from "@/app/navigation";

interface DashboardNavigationLoader {
  icon: ComponentType;
  component: ComponentType;
}

export const dashboardNavigationLoaders = {
  overview: {
    icon: LayoutDashboardIcon,
    component: lazyRouteComponent(
      () => import("@/screens/dashboard-home"),
      "DashboardHome",
    ),
  },
  projects: {
    icon: BriefcaseBusinessIcon,
    component: lazyRouteComponent(
      () => import("@/screens/projects-screen"),
      "ProjectsScreen",
    ),
  },
  leads: {
    icon: InboxIcon,
    component: lazyRouteComponent(
      () => import("@/screens/leads-screen"),
      "LeadsScreen",
    ),
  },
  resume: {
    icon: FileTextIcon,
    component: lazyRouteComponent(
      () => import("@/screens/resume-screen"),
      "ResumeScreen",
    ),
  },
  settings: {
    icon: SettingsIcon,
    component: lazyRouteComponent(
      () => import("@/screens/settings-screen"),
      "SettingsScreen",
    ),
  },
} satisfies Record<DashboardNavigationId, DashboardNavigationLoader>;
