import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Shield, Building2, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import "../styles/login-only.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEV_PRESETS = {
  superAdmin: {
    label: "Use Super Admin",
    email: "admin@yourapp.com",
    password: "Admin@123",
  },
  gymOwner: {
    label: "Use Gym Owner",
    email: "owner@gym.com",
    password: "Owner@123",
  },
};

function getRoleRedirect(user, fallbackPath = "/dashboard") {
  const role = String(user?.role || "").toUpperCase();

  switch (role) {
    case "SUPER_ADMIN":
      return "/saas-admin";
    case "OWNER":
      return fallbackPath;
    default:
      return "/dashboard";
  }
}

export default function LoginPage() {
  const { login, isAuthenticated, bootstrapping, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const from = location.state?.from?.pathname;
    return typeof from === "string" && from.startsWith("/") ? from : "/dashboard";
  }, [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bootstrapping && isAuthenticated && user) {
      navigate(getRoleRedirect(user, redirectTo), { replace: true });
    }
  }, [bootstrapping, isAuthenticated, user, navigate, redirectTo]);

  const validate = (values) => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    return nextErrors;
  };

  const applyPreset = ({ email, password }) => {
    setEmail(email);
    setPassword(password);
    setErrors({});
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formValues = { email, password };
    const nextErrors = validate(formValues);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSubmitting(true);
      const loggedInUser = await login({ email: email.trim(), password });
      navigate(getRoleRedirect(loggedInUser, redirectTo), { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Unable to sign in. Please check your details and try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-avatar" aria-hidden="true">
          <User size={34} strokeWidth={2.2} />
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">
          Sign in as a super admin or gym owner to continue
        </p>

        {submitError ? (
          <div className="login-alert" role="alert">
            {submitError}
          </div>
        ) : null}

        <div className="login-fields">
          <div className="field">
            <label className="sr-only" htmlFor="email">
              Email address
            </label>
            <div className="input-shell">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Email address"
                autoComplete="username"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
                required
              />
            </div>
            {errors.email ? (
              <p id="email-error" className="field-error" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <div className="input-shell password-wrap">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Password"
                autoComplete="current-password"
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={errors.password ? "password-error" : undefined}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? (
              <p id="password-error" className="field-error" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>
        </div>

        <button type="submit" className="login-btn" disabled={submitting}>
          {submitting ? "Signing In..." : "Sign In"}
        </button>

        {/* 💎 FIXED ONE-LINE INLINE SUPPORT FOOTER */}
        <div className="login-support-notice">
          <p className="support-text">
            If you want to register or reset your password, kindly contact your software admin with these details:
          </p>
          <div className="support-row-inline">
            <a href="mailto:admin@gym-saas.app" className="support-link-item">
              Email: <span>admin@gym-saas.app</span>
            </a>
            <span className="support-separator"> | </span>
            <a href="https://wa.me/918868069884" target="_blank" rel="noopener noreferrer" className="support-link-item">
              WhatsApp: <span>+91 88680 69884</span>
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}
