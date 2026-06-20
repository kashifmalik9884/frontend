import { useState } from "react";
import { Shield, UserCog, Bell, Save, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import api from "../services/api"; 

export default function SaasAdminSettingsPage() {
  const { user } = useAuth(); 

  const [profile, setProfile] = useState({
    fullName: user?.fullName || "Super Admin",
    email: user?.email || "admin@yourapp.com",
  });

  const [preferences, setPreferences] = useState({
    renewalAlerts: true,
    suspensionAlerts: true,
    weeklySummary: false,
  });

  const [isSaving, setIsSaving] = useState(false); 
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreferenceToggle = (field) => {
    setPreferences((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");
    setIsSaving(true);

    try {
      // Send the safe profile payload update to your Spring Boot controller
      const response = await api.put("/saas-admin/profile", {
        fullName: profile.fullName,
        email: profile.email // Keeps current valid email identifier intact
      });
      setMessage(response.data || "Profile details updated successfully!");
    } catch (err) {
      console.error("Failed to persist administration updates:", err);
      setErrorMsg(err.response?.data?.message || "Internal database sync error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your super admin profile and platform preferences.</p>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      <form className="page-stack" onSubmit={handleSave}>
        <div className="card table-card">
          <div className="section-head">
            <div>
              <h2>Profile</h2>
              <p>Update your account identity details.</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <div className="input-shell">
                <UserCog size={18} className="input-icon" />
                <input
                  id="fullName"
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => handleProfileChange("fullName", e.target.value)}
                  placeholder="Full name"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="email">Email address (Account ID)</label>
              <div className="input-shell" style={{ opacity: 0.6, cursor: "not-allowed" }}>
                <Shield size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled // 🌟 FIXED: Prevents system crashes by making account identity read-only
                  style={{ cursor: "not-allowed" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card table-card">
          <div className="section-head">
            <div>
              <h2>Notifications</h2>
              <p>Choose which platform alerts you want to receive.</p>
            </div>
          </div>

          <div className="page-stack" style={{ gap: 12 }}>
            <label className="settings-check-row">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Bell size={16} />
                Renewal alerts
              </span>
              <input
                type="checkbox"
                checked={preferences.renewalAlerts}
                onChange={() => handlePreferenceToggle("renewalAlerts")}
              />
            </label>

            <label className="settings-check-row">
              <span>Suspension alerts</span>
              <input
                type="checkbox"
                checked={preferences.suspensionAlerts}
                onChange={() => handlePreferenceToggle("suspensionAlerts")}
              />
            </label>

            <label className="settings-check-row">
              <span>Weekly summary email</span>
              <input
                type="checkbox"
                checked={preferences.weeklySummary}
                onChange={() => handlePreferenceToggle("weeklySummary")}
              />
            </label>
          </div>
        </div>

        <div>
          <button type="submit" className="inline-action-btn" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}