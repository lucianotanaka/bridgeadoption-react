import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import "@/i18n";

import AppLayout from "@/components/layout/AppLayout";
import PrivateRoute from "@/router/PrivateRoute";
import PermissionRoute, { AdminRoute } from "@/router/PermissionRoute";
import LoginPage from "@/pages/auth/LoginPage";
import ChangePasswordPage from "@/pages/auth/ChangePasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import TaskPage from "@/pages/tasks/TaskPage";

// Adoption
import CiscoLCIPage from "@/pages/ciscoLci/CiscoLCIPage";
import CsmAccountPage from "@/pages/adoption/CsmAccountPage";
import TeamTargetPage from "@/pages/adoption/TeamTargetPage";
import RebatePage from "@/pages/adoption/RebatePage";
import UseCasesPage from "@/pages/adoption/UseCasesPage";

// Portfolio
import PortfolioPage from "@/pages/portfolio/PortfolioPage";
import FarolPage from "@/pages/portfolio/FarolPage";
import AssetPage from "@/pages/portfolio/AssetPage";
import AccountTeamPage from "@/pages/portfolio/AccountTeamPage";
import AdoptionTasksPage from "@/pages/portfolio/AdoptionTasksPage";
import ClientOverviewPage from "@/pages/portfolio/ClientOverviewPage";
import CiscoEAPage from "@/pages/portfolio/CiscoEAPage";

// Public
import PublicCsmAccountPage from "@/pages/public/PublicCsmAccountPage";
import ImporterPage from "@/pages/public/ImporterPage";

// Projects / Renewals / Admin
import ProjectsPage from "@/pages/projects/ProjectsPage";
import RenewalsPage from "@/pages/renewals/RenewalsPage";
import AdminPage from "@/pages/admin/AdminPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCompaniesPage from "@/pages/admin/AdminCompaniesPage";
import AdminRolesPage from "@/pages/admin/AdminRolesPage";
import AdminTeamGoalsPage from "@/pages/admin/AdminTeamGoalsPage";
import AdminTasksPage from "@/pages/admin/AdminTasksPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Carregando...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/bridgeadoption">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public (unauthenticated) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            {/* Protected — requires valid JWT token */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>

                {/* Dashboard — always accessible when authenticated */}
                <Route path="/" element={<DashboardPage />} />

                {/* Tasks */}
                <Route element={<PermissionRoute resourceKey="task.task" />}>
                  <Route path="/tasks" element={<TaskPage />} />
                </Route>

                {/* Adoption */}
                {/* Cisco LCI page bundles 4 sub-reports (Report, Forecast, Eligible Status, Solution vs Project),
                    each with its own resource_key — access is granted if the user has permission for ANY of them. */}
                <Route
                  element={
                    <PermissionRoute
                      resourceKeys={[
                        "adoption.report_cisco_lci",
                        "adoption.report_forecast",
                        "adoption.report_lci_eligible_status",
                        "adoption.report_lci_solution_vs_project",
                      ]}
                    />
                  }
                >
                  <Route path="/adoption/cisco-lci" element={<CiscoLCIPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="adoption.report_csm_account" />}>
                  <Route path="/adoption/csm-account" element={<CsmAccountPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="adoption.report_team_target" />}>
                  <Route path="/adoption/team-target" element={<TeamTargetPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="adoption.opportunities" />}>
                  <Route path="/adoption/rebate" element={<RebatePage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="adoption.use_case" />}>
                  <Route path="/adoption/use-cases" element={<UseCasesPage />} />
                </Route>

                {/* Portfolio */}
                <Route element={<PermissionRoute resourceKey="portfolio.farol" />}>
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/portfolio/farol" element={<FarolPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="portfolio.asset" />}>
                  <Route path="/portfolio/asset" element={<AssetPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="portfolio.account_team" />}>
                  <Route path="/portfolio/account-team" element={<AccountTeamPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="portfolio.adoption_tasks" />}>
                  <Route path="/portfolio/adoption-tasks" element={<AdoptionTasksPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="portfolio.client_overview" />}>
                  <Route path="/portfolio/client-overview" element={<ClientOverviewPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="portfolio.cisco_enterprise_agreement" />}>
                  <Route path="/portfolio/cisco-ea" element={<CiscoEAPage />} />
                </Route>

                {/* Projects */}
                <Route element={<PermissionRoute resourceKey="project.project" />}>
                  <Route path="/projects" element={<ProjectsPage />} />
                </Route>

                {/* Renewals (no specific resourceKey yet — accessible when authenticated) */}
                <Route path="/renewals" element={<RenewalsPage />} />

                {/* Public modules */}
                <Route element={<PermissionRoute resourceKey="public.csm_account" />}>
                  <Route path="/public/csm-account" element={<PublicCsmAccountPage />} />
                </Route>
                <Route element={<PermissionRoute resourceKey="public.importer" />}>
                  <Route path="/public/importer" element={<ImporterPage />} />
                  <Route path="/importer" element={<ImporterPage />} />
                </Route>

                {/* Admin — requires ADMIN role */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminPage />} />
                  <Route element={<PermissionRoute resourceKey="admin.admin_user" />}>
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                  </Route>
                  <Route element={<PermissionRoute resourceKey="admin.admin_company" />}>
                    <Route path="/admin/companies" element={<AdminCompaniesPage />} />
                  </Route>
                  <Route element={<PermissionRoute resourceKey="admin.admin_auth_role" />}>
                    <Route path="/admin/roles" element={<AdminRolesPage />} />
                  </Route>
                  <Route element={<PermissionRoute resourceKey="admin.admin_team_goal" />}>
                    <Route path="/admin/team-goals" element={<AdminTeamGoalsPage />} />
                  </Route>
                  <Route element={<PermissionRoute resourceKey="admin.admin_task" />}>
                    <Route path="/admin/tasks" element={<AdminTasksPage />} />
                  </Route>
                </Route>

              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
