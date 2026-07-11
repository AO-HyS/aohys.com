import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { DashboardShell } from "@/app/dashboard-shell";
import { dashboardNavigation } from "@/app/navigation";
import {
  RouteErrorState,
  RouteNotFoundState,
  RoutePendingState,
} from "@/app/route-states";

const rootRoute = createRootRoute({
  component: DashboardShell,
});

const canonicalRoutes = dashboardNavigation.map((item) => createRoute({
  getParentRoute: () => rootRoute,
  path: item.path,
  component: item.component,
}));

const aliasRoutes = dashboardNavigation.flatMap((item) => item.aliases.map((path) => createRoute({
  getParentRoute: () => rootRoute,
  path,
  component: item.component,
})));

const routeTree = rootRoute.addChildren([...canonicalRoutes, ...aliasRoutes]);

export const dashboardRouter = createRouter({
  basepath: "/dashboard",
  routeTree,
  defaultPendingMs: 150,
  defaultPendingMinMs: 250,
  defaultPendingComponent: RoutePendingState,
  defaultErrorComponent: RouteErrorState,
  defaultNotFoundComponent: RouteNotFoundState,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof dashboardRouter;
  }
}
