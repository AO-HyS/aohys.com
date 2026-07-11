import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { dashboardRouter } from "@/app/router";
import { authClient } from "@/lib/auth-client";
import {
  captureDashboardEvent,
  createDashboardPathObserver,
  dashboardSurfaceFromPath,
  initializeDashboardAnalytics,
} from "@/lib/analytics";
import { dashboardClass } from "@/lib/dashboard-classes";
import { dashboardRuntimeConfig } from "@/runtime-config";
import "./styles.css";

const runtimeConfig = dashboardRuntimeConfig;
document.documentElement.className = dashboardClass.appRoot;
initializeDashboardAnalytics(runtimeConfig);
const convex = new ConvexReactClient(runtimeConfig.convexUrl, {
  expectAuth: true,
});

function captureDashboardSurface(path: string) {
  captureDashboardEvent("dashboard_surface_viewed", {
    environment: runtimeConfig.environment,
    surface: dashboardSurfaceFromPath(path),
    path,
  });
}

const observeDashboardPath = createDashboardPathObserver(
  window.location.pathname,
  captureDashboardSurface,
);
dashboardRouter.history.subscribe(({ location }) => {
  observeDashboardPath(location.pathname);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <RouterProvider router={dashboardRouter} />
    </ConvexBetterAuthProvider>
  </StrictMode>,
);
