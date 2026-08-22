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
      () => import("@/features/overview"),
      "DashboardHome",
    ),
  },
  projects: {
    icon: BriefcaseBusinessIcon,
    component: lazyRouteComponent(
      () => import("@/features/projects"),
      "ProjectsScreen",
    ),
  },
  leads: {
    icon: InboxIcon,
    component: lazyRouteComponent(
      () => import("@/features/leads"),
      "LeadsScreen",
    ),
  },
  resume: {
    icon: FileTextIcon,
    component: lazyRouteComponent(
      () => import("@/features/resume"),
      "ResumeScreen",
    ),
  },
  settings: {
    icon: SettingsIcon,
    component: lazyRouteComponent(
      () => import("@/features/settings"),
      "SettingsScreen",
    ),
  },
} satisfies Record<DashboardNavigationId, DashboardNavigationLoader>;
