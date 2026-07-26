import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import apiClient from "@/api/client";

export default function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  const token = useAuthStore((s) => s.token);
  const isDark = mode === "dark";

  const handleToggle = async () => {
    const newMode = isDark ? "light" : "dark";
    setMode(newMode);
    // Save to DB if authenticated
    if (token) {
      try {
        await apiClient.put("/auth/theme", { theme: newMode });
      } catch {
        // non-critical — theme still changes locally
      }
    }
  };

  return (
    <button
      onClick={() => void handleToggle()}
      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
