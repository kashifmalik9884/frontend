import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Fingerprint,
  CreditCard,
  Banknote,
  Shield,
  Building2,
  CalendarClock,
  Settings,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthProvider";

const OWNER_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/members", label: "Members", icon: Users, end: false },
  { to: "/billing", label: "Payments & Billing", icon: Banknote, end: false },
  { to: "/attendance", label: "Attendance", icon: Fingerprint, end: false },
  { to: "/dues", label: "Upcoming Dues", icon: CreditCard, end: false },
];

const SUPER_ADMIN_NAV_ITEMS = [
  { to: "/saas-admin", label: "Dashboard", icon: Shield, end: true },
  { to: "/saas-admin/gyms", label: "Gyms", icon: Building2, end: false },
  { to: "/saas-admin/renewals", label: "Renewals", icon: CalendarClock, end: false },
  { to: "/saas-admin/settings", label: "Settings", icon: Settings, end: false },
];

function normalizeRole(role) {
  return String(role || "").toUpperCase();
}

function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") return "Super Admin";
  if (normalizedRole === "OWNER") return "Gym Owner";
  return "User";
}

function getNavItems(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "SUPER_ADMIN"
    ? SUPER_ADMIN_NAV_ITEMS
    : OWNER_NAV_ITEMS;
}

function getPageTitle(pathname, role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPER_ADMIN") {
    if (pathname === "/saas-admin") return "SaaS Admin Dashboard";
    if (pathname === "/saas-admin/gyms") return "Gyms";
    if (pathname === "/saas-admin/renewals") return "Renewals";
    if (pathname === "/saas-admin/settings") return "Settings";
    return "SaaS Admin";
  }

  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/members") return "Members";
  if (pathname === "/billing") return "Payments & Fees";
  if (pathname === "/attendance") return "Attendance";
  if (pathname === "/dues") return "Upcoming Dues";
  return "Dashboard";
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = normalizeRole(user?.role);
  const navItems = getNavItems(role);
  const pageTitle = getPageTitle(location.pathname, role);
  const roleLabel = getRoleLabel(role);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>
          {role === "SUPER_ADMIN" ? "GYM SAAS ADMIN" : user?.gymName || "GYM SAAS"}
        </h2>

        <nav>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} style={{ marginRight: 10, verticalAlign: "middle" }} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PanelLeft size={18} />
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{roleLabel}</div>
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {user?.fullName || "User"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {user?.email || ""}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}