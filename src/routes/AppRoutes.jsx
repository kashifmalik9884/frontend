import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";
import DashboardHomePage from "../pages/DashboardHomePage";
import SaasAdminDashboardPage from "../pages/SaasAdminDashboardPage";
import GymsPage from "../pages/GymsPage";
import RenewalsPage from "../pages/RenewalsPage";
import SaasAdminSettingsPage from "../pages/SaasAdminSettingsPage";
import MembersPage from "../features/members/MembersPage";
import PaymentsPage from "../pages/PaymentPage"; // 🌟 Import the newly added component file
import MembersAttendancePage from "../pages/MembersAttendancePage";
import UpcomingDuesPage from "../pages/UpcomingDuesPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route element={<RoleRoute allowedRoles={["OWNER"]} />}>
            <Route path="/dashboard" element={<DashboardHomePage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/billing" element={<PaymentsPage />} /> {/* 🌟 Hook up the new secure manual ledger path */}
            <Route path="/attendance" element={<MembersAttendancePage />} />
            <Route path="/dues" element={<UpcomingDuesPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
            <Route path="/saas-admin" element={<SaasAdminDashboardPage />} />
            <Route path="/saas-admin/gyms" element={<GymsPage />} />
            <Route path="/saas-admin/renewals" element={<RenewalsPage />} />
            <Route
              path="/saas-admin/settings"
              element={<SaasAdminSettingsPage />}
            />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}