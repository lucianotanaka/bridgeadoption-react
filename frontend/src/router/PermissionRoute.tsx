import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

interface PermissionRouteProps {
  /** resource_key that the user must have permission for (e.g. "task.task") */
  resourceKey?: string;
  /** Use when access should be granted if the user has ANY of these resource_keys (e.g. a module bundling several sub-reports). */
  resourceKeys?: string[];
  /** Where to redirect if permission is denied. Defaults to "/" */
  redirectTo?: string;
}

/**
 * Route guard that checks if the authenticated user has the required resource_key permission.
 * Equivalent to can("resource_key") in the Streamlit version.
 *
 * Usage in App.tsx:
 *   <Route element={<PermissionRoute resourceKey="task.task" />}>
 *     <Route path="/tasks" element={<TaskPage />} />
 *   </Route>
 *
 * For modules that bundle multiple sub-reports (each with its own resource_key),
 * pass resourceKeys instead — access is granted if the user has ANY of them:
 *   <Route element={<PermissionRoute resourceKeys={["adoption.report_cisco_lci", "adoption.report_forecast"]} />}>
 *     <Route path="/adoption/cisco-lci" element={<CiscoLCIPage />} />
 *   </Route>
 *
 * Behavior:
 * - ADMIN users: always allowed (bypasses permission check)
 * - Users with the resourceKey (or at least one of resourceKeys) in their permissions: allowed
 * - Others: redirected to redirectTo (default: "/")
 */
export default function PermissionRoute({
  resourceKey,
  resourceKeys,
  redirectTo = "/",
}: PermissionRouteProps) {
  const hasPermissionFn = useAuthStore((s) => s.hasPermission);

  const allowed = resourceKeys && resourceKeys.length > 0
    ? resourceKeys.some((rk) => hasPermissionFn(rk))
    : resourceKey
      ? hasPermissionFn(resourceKey)
      : false;

  if (!allowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

/**
 * Admin-only route guard. Equivalent to require_admin() in the Streamlit version.
 * Blocks access to any user that does not have the ADMIN role.
 */
export function AdminRoute({ redirectTo = "/" }: { redirectTo?: string }) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;

  if (!isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
