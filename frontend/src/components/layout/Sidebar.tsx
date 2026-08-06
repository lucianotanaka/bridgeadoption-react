import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  CheckSquare,
  TrendingUp,
  BarChart3,
  Target,
  Users,
  Package,
  FolderOpen,
  Settings,
  Upload,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Building,
  Shield,
  Activity,
  LayoutDashboard,
  DollarSign,
  Lightbulb,
  Briefcase,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/store/authStore";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
  resourceKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "tasks", label: "Tasks", icon: <CheckSquare size={18} />, path: "/tasks", resourceKey: "task.task" },
  {
    key: "adoption", label: "Adoption", icon: <TrendingUp size={18} />,
    children: [
      { key: "today", label: "Today", icon: <LayoutDashboard size={16} />, path: "/" },
      { key: "ciscoLCI", label: "Cisco LCI", icon: <Package size={16} />, path: "/adoption/cisco-lci", resourceKey: "adoption.report_cisco_lci" },
      { key: "csmAccount", label: "CSM Account", icon: <Users size={16} />, path: "/adoption/csm-account", resourceKey: "adoption.report_csm_account" },
      { key: "teamTarget", label: "Team Target", icon: <Target size={16} />, path: "/adoption/team-target", resourceKey: "adoption.report_team_target" },
      { key: "rebate", label: "Rebate", icon: <DollarSign size={16} />, path: "/adoption/rebate", resourceKey: "adoption.report_rebate_and_opportunities" },
      { key: "useCases", label: "Use Cases", icon: <Lightbulb size={16} />, path: "/adoption/use-cases", resourceKey: "adoption.use_case" },
    ],
  },
  {
    key: "portfolio", label: "Portfolio", icon: <FolderOpen size={18} />,
    children: [
      { key: "portfolioFarol", label: "Farol", icon: <Activity size={16} />, path: "/portfolio/farol", resourceKey: "portfolio.farol" },
      { key: "portfolioAsset", label: "Assets", icon: <Package size={16} />, path: "/portfolio/asset", resourceKey: "portfolio.asset" },
      { key: "portfolioAccountTeam", label: "Account Team", icon: <Users size={16} />, path: "/portfolio/account-team", resourceKey: "portfolio.account_team" },
      { key: "portfolioAdoptionTasks", label: "Adoption Tasks", icon: <CheckSquare size={16} />, path: "/portfolio/adoption-tasks", resourceKey: "portfolio.adoption_tasks" },
      { key: "portfolioClientOverview", label: "Client Overview", icon: <BarChart3 size={16} />, path: "/portfolio/client-overview", resourceKey: "portfolio.client_overview" },
    ],
  },
  { key: "project", label: "Projects", icon: <Briefcase size={18} />, path: "/projects", resourceKey: "project.project" },
  {
    key: "public", label: "Public", icon: <Package size={18} />,
    children: [
      { key: "publicCsmAccount", label: "CSM Account", icon: <Users size={16} />, path: "/public/csm-account", resourceKey: "public.csm_account" },
      { key: "publicImporter", label: "Importer", icon: <Upload size={16} />, path: "/public/importer", resourceKey: "public.importer" },
    ],
  },
  {
    key: "admin", label: "Admin", icon: <Settings size={18} />,
    children: [
      { key: "adminUsers", label: "Users", icon: <Users size={16} />, path: "/admin/users", resourceKey: "admin.admin_user" },
      { key: "adminCompanies", label: "Companies", icon: <Building size={16} />, path: "/admin/companies", resourceKey: "admin.admin_company" },
      { key: "adminRoles", label: "Roles & Auth", icon: <Shield size={16} />, path: "/admin/roles", resourceKey: "admin.admin_auth_role" },
      { key: "adminTeamGoals", label: "Team Goals", icon: <Target size={16} />, path: "/admin/team-goals", resourceKey: "admin.admin_team_goal" },
      { key: "adminTasks", label: "Tasks (Admin)", icon: <CheckSquare size={16} />, path: "/admin/tasks", resourceKey: "admin.admin_task" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s: { user: User | null }) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["adoption"]));

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const canSee = (item: NavItem): boolean => {
    if (isAdmin) return true;
    if (!item.resourceKey) return true;
    return hasPermission(item.resourceKey);
  };

  const canSeeGroup = (item: NavItem): boolean => {
    if (!item.children) return canSee(item);
    return item.children.some((c) => canSee(c));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const renderItem = (item: NavItem, depth = 0) => {
    if (item.children) {
      if (!canSeeGroup(item)) return null;
      const isOpen = openGroups.has(item.key);
      const hasActiveChild = item.children.some((c) => isActive(c.path));
      return (
        <div key={item.key}>
          <button onClick={() => toggleGroup(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${hasActiveChild ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"}`}>
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (<><span className="flex-1 text-left">{item.label}</span>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</>)}
          </button>
          {!collapsed && isOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    if (!canSee(item)) return null;

    return (
      <NavLink key={item.key} to={item.path ?? "/"}
        className={({ isActive: active }) =>
          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-blue-600 dark:bg-blue-700 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"} ${depth > 0 ? "text-xs" : ""}`
        }
        title={collapsed ? item.label : undefined}>
        <span className="flex-shrink-0">{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <aside className={`flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${collapsed ? "w-14" : "w-56"} shrink-0`}>
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">BA</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Bridge Adoption</span>
          </div>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV_ITEMS.map((item) => renderItem(item))}
      </nav>
      {!collapsed && user && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-sm">
              {user.full_name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
