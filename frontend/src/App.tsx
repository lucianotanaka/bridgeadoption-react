import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import "@/i18n";

import AppLayout from "@/components/layout/AppLayout";
import PrivateRoute from "@/router/PrivateRoute";
import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import TaskPage from "@/pages/tasks/TaskPage";

// Adoption
import ForecastPage from "@/pages/adoption/ForecastPage";
import CiscoLCIPage from "@/pages/adoption/CiscoLCIPage";
import CsmAccountPage from "@/pages/adoption/CsmAccountPage";
import TeamTargetPage from "@/pages/adoption/TeamTargetPage";
import LCIStatusPage from "@/pages/adoption/LCIStatusPage";
import LCISolutionVsProjectPage from "@/pages/adoption/LCISolutionVsProjectPage";
import RebatePage from "@/pages/adoption/RebatePage";
import UseCasesPage from "@/pages/adoption/UseCasesPage";

// Portfolio
import PortfolioPage from "@/pages/portfolio/PortfolioPage";
import FarolPage from "@/pages/portfolio/FarolPage";
import AssetPage from "@/pages/portfolio/AssetPage";
import AccountTeamPage from "@/pages/portfolio/AccountTeamPage";
import AdoptionTasksPage from "@/pages/portfolio/AdoptionTasksPage";
import ClientOverviewPage from "@/pages/portfolio/ClientOverviewPage";

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
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tasks" element={<TaskPage />} />

                {/* Adoption */}
                <Route path="/adoption/kpi" element={<PlaceholderPage title="KPIs" />} />
                <Route path="/adoption/forecast" element={<ForecastPage />} />
                <Route path="/adoption/cisco-lci" element={<CiscoLCIPage />} />
                <Route path="/adoption/csm-account" element={<CsmAccountPage />} />
                <Route path="/adoption/team-target" element={<TeamTargetPage />} />
                <Route path="/adoption/lci-status" element={<LCIStatusPage />} />
                <Route path="/adoption/lci-solution-vs-project" element={<LCISolutionVsProjectPage />} />
                <Route path="/adoption/rebate" element={<RebatePage />} />
                <Route path="/adoption/use-cases" element={<UseCasesPage />} />

                {/* Portfolio */}
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/portfolio/farol" element={<FarolPage />} />
                <Route path="/portfolio/asset" element={<AssetPage />} />
                <Route path="/portfolio/account-team" element={<AccountTeamPage />} />
                <Route path="/portfolio/adoption-tasks" element={<AdoptionTasksPage />} />
                <Route path="/portfolio/client-overview" element={<ClientOverviewPage />} />

                {/* Renewals */}
                <Route path="/renewals" element={<RenewalsPage />} />

                {/* Pre-sales */}
                <Route path="/presales" element={<PlaceholderPage title="Pré-vendas" />} />

                {/* Projects */}
                <Route path="/projects" element={<ProjectsPage />} />

                {/* Technical */}
                <Route path="/technical" element={<PlaceholderPage title="Técnico" />} />

                {/* Public */}
                <Route path="/public/csm-account" element={<PublicCsmAccountPage />} />
                <Route path="/public/importer" element={<ImporterPage />} />
                {/* Legacy importer redirect */}
                <Route path="/importer" element={<ImporterPage />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/companies" element={<AdminCompaniesPage />} />
                <Route path="/admin/roles" element={<AdminRolesPage />} />
                <Route path="/admin/team-goals" element={<AdminTeamGoalsPage />} />
                <Route path="/admin/tasks" element={<AdminTasksPage />} />
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

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{title}</h2>
      <p className="text-gray-400 text-sm">Módulo em desenvolvimento — migração em andamento</p>
    </div>
  );
}
