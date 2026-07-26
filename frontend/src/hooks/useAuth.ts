import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import apiClient from "@/api/client";
import i18n from "@/i18n";

interface LoginCredentials {
  email: string;
  password: string;
}

// Matches backend LoginResponse schema
interface LoginApiResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  user_name: string;
  roles: string[];
  permissions: Record<string, unknown>;
  language: string;
  theme: string;
  require_password_change: boolean;
}

// Matches backend UserMeResponse schema
interface MeApiResponse {
  user_id: number;
  user_name: string;
  roles: string[];
  permissions: Record<string, unknown>;
  language: string;
}

/** Maps full language codes from DB (pt-BR, en-US, es-ES) to short codes (pt, en, es) */
function normalizeLanguage(lang: string): string {
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("es")) return "es";
  return "pt";
}

/**
 * Extracts resource_keys (with show_in_menu=1) from the nested permissions structure.
 * Input: { ROLE: { "Resource Name": { resource_key, show_in_menu, ... } } }
 * Output: ["adoption.report_forecast", "task.task", ...]
 */
function extractResourceKeys(permissions: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const rolePerms of Object.values(permissions)) {
    if (typeof rolePerms !== "object" || rolePerms === null) continue;
    for (const perm of Object.values(rolePerms as Record<string, unknown>)) {
      if (typeof perm !== "object" || perm === null) continue;
      const p = perm as { resource_key?: string; show_in_menu?: number };
      if (p.resource_key && p.show_in_menu === 1) {
        keys.push(p.resource_key);
      }
    }
  }
  return keys;
}

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    setAuth,
    clearAuth,
    setLoading,
    hasPermission,
    hasRole,
  } = useAuthStore();
  const { setMode } = useThemeStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      try {
        const response = await apiClient.post<LoginApiResponse>("/auth/login", {
          email: credentials.email,
          password: credentials.password,
        });

        const { access_token, user_id, user_name, roles, permissions, language, theme } = response.data;

        setAuth(
          {
            id: user_id,
            email: credentials.email,
            full_name: user_name,
            role: roles[0] ?? "user",
            is_active: true,
            permissions: extractResourceKeys(permissions),
            roles,
            language: normalizeLanguage(language),
          },
          access_token
        );

        // Apply saved theme preference from DB
        const savedTheme = (theme === "light" ? "light" : "dark") as "dark" | "light";
        setMode(savedTheme);

        // Sync i18n language with user's preferred language
        const lang = normalizeLanguage(language);
        void i18n.changeLanguage(lang);

        navigate("/");
        return { success: true };
      } catch (error) {
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, setMode, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore
    }
    clearAuth();
    navigate("/login");
  }, [clearAuth, navigate]);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiClient.get<MeApiResponse>("/auth/me");
      const { user_id, user_name, roles, permissions, language } = response.data;
      setAuth(
        {
          id: user_id,
          email: user?.email ?? "",
          full_name: user_name,
          role: roles[0] ?? "user",
          is_active: true,
          permissions: extractResourceKeys(permissions),
          roles,
          language: normalizeLanguage(language),
        },
        token
      );
    } catch {
      clearAuth();
    }
  }, [token, user, setAuth, clearAuth]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    fetchCurrentUser,
    hasPermission,
    hasRole,
  };
}
