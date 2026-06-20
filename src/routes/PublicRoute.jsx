import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

function getRoleRedirect(user) {
  const role = String(user?.role || "").toUpperCase();

  switch (role) {
    case "SUPER_ADMIN":
      return "/saas-admin";
    case "OWNER":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

export default function PublicRoute() {
  const { isAuthenticated, bootstrapping, user } = useAuth();

  if (bootstrapping) {
    return (
      <div className="page-stack">
        <p>Checking session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getRoleRedirect(user)} replace />;
  }

  return <Outlet />;
}