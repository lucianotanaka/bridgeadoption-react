import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

interface PermissionRouteProps {
  /** resource_key that the user must have permission for (e.g. "task.task") */
  resourceKey: string;
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
 * Behavior:
 * - ADMIN users: always allowed (bypasses permission check)
 * - Users with the resourceKey in their permissions: allowed
 * - Others: redirected to redirectTo (default: "/")
 */
export default function PermissionRoute({
  resourceKey,
  redirectTo = "/",
}: PermissionRouteProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission(resourceKey));

  if (!hasPermission) {
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
