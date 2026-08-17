import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string; // primary role (first in array)
  roles: string[]; // all roles
  is_active: boolean;
  permissions: string[]; // resource_keys
  language: string; // "pt-BR" | "en-US" | "es-ES"
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requirePasswordChange: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setRequirePasswordChange: (value: boolean) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      requirePasswordChange: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false, requirePasswordChange: false });
      },

      setRequirePasswordChange: (value) => {
        set({ requirePasswordChange: value });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.roles.includes("ADMIN")) return true;
        return user.permissions?.includes(permission) ?? false;
      },

      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        if (Array.isArray(role)) {
          return role.some((r) => user.roles.includes(r.toUpperCase()));
        }
        return user.roles.includes(role.toUpperCase());
      },
    }),
    {
      name: "bridge-adoption-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
