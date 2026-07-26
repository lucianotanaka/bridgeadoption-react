import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark", // Dark is default

      setMode: (mode) => {
        applyTheme(mode);
        set({ mode });
      },
    }),
    {
      name: "bridge-adoption-theme",
      onRehydrateStorage: () => (state) => {
        // Apply theme on page load from persisted state
        if (state) {
          applyTheme(state.mode);
        } else {
          // No persisted state — apply default dark
          applyTheme("dark");
        }
      },
    }
  )
);

// Apply dark theme immediately on module load (before React hydration)
if (typeof document !== "undefined") {
  const stored = localStorage.getItem("bridge-adoption-theme");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { state?: { mode?: ThemeMode } };
      applyTheme(parsed?.state?.mode ?? "dark");
    } catch {
      applyTheme("dark");
    }
  } else {
    applyTheme("dark");
  }
}
