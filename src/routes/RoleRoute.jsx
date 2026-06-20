import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function RoleRoute({ allowedRoles = [] }) {
  const { isAuthenticated, bootstrapping, user } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="page-stack">
        <p>Checking permissions...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentRole = String(user?.role || "").toUpperCase();
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toUpperCase()
  );

  const hasAccess = normalizedAllowedRoles.includes(currentRole);

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}