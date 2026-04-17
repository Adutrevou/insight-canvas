// Shim kept so the Lovable sandbox dev server (which expects a TanStack Start
// router entry) can still boot. The real production entry is src/main.tsx,
// which is what gets bundled for the static SPA build deployed to the VPS.
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
};
