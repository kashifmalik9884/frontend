import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Plus, ShieldCheck, AlertTriangle } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthProvider";

const emptyForm = {
  name: "",
  slug: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  accessStartDate: "",
  accessEndDate: "",
  status: "active",
};

function getStatusTone(status) {
  const value = String(status || "").toLowerCase();
  if (value === "active") return "badge-success";
  if (value === "suspended") return "badge-error";
  if (value === "expired") return "badge-warning";
  return "badge-neutral";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeGym(gym) {
  return {
    ...gym,
    status: gym?.status || "active",
  };
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function GymsPage() {
  const { logout } = useAuth();

  const [search, setSearch] = useState("");
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadGyms = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/saas-admin/gyms");
      const normalized = Array.isArray(data) ? data.map(normalizeGym) : [];
      setGyms(normalized);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await logout();
        return;
      }
      setError("Failed to load gyms.");
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  const filteredGyms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return gyms;

    return gyms.filter((gym) =>
      [gym.name, gym.ownerName, gym.ownerEmail, gym.status].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [gyms, search]);

  const summary = useMemo(() => {
    return {
      total: gyms.length,
      active: gyms.filter((gym) => String(gym.status).toLowerCase() === "active").length,
      suspended: gyms.filter((gym) => String(gym.status).toLowerCase() === "suspended").length,
      expired: gyms.filter((gym) => String(gym.status).toLowerCase() === "expired").length,
    };
  }, [gyms]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setSuccessMessage("");
    setShowForm(true);
  };

  const openEditForm = (gym) => {
    setEditingId(gym.id);
    setForm({
      name: gym.name || "",
      slug: gym.slug || "",
      ownerName: gym.ownerName || "",
      ownerEmail: gym.ownerEmail || "",
      ownerPassword: "",
      accessStartDate: gym.accessStartDate || "",
      accessEndDate: gym.accessEndDate || "",
      status: gym.status || "active",
    });
    setSuccessMessage("");
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildGymPayload = () => ({
    name: form.name.trim(),
    slug: form.slug.trim() || slugify(form.name),
    ownerName: form.ownerName.trim(),
    ownerEmail: form.ownerEmail.trim(),
    ownerPassword: form.ownerPassword,
    accessStartDate: form.accessStartDate,
    accessEndDate: form.accessEndDate,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = buildGymPayload();

      if (editingId) {
        const { data } = await api.put(`/saas-admin/gyms/${editingId}`, payload);
        const updatedGym = normalizeGym(data || { id: editingId, ...payload });

        setGyms((prev) =>
          prev.map((gym) => (gym.id === editingId ? updatedGym : gym))
        );

        setSuccessMessage("Gym updated successfully.");
      } else {
        const { data } = await api.post("/saas-admin/gyms", payload);
        setGyms((prev) => [...prev, normalizeGym(data)]);
        setSuccessMessage("Gym created successfully.");
      }

      setShowForm(false);
      resetForm();
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await logout();
        return;
      }
      setError(e?.response?.data?.message || "Failed to save gym.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Gyms</h1>
          <p>Manage gym accounts, owners, and subscription access.</p>
        </div>

        <div className="page-actions members-actions">
          <div className="field search-field">
            <label htmlFor="gymSearch">Search Gyms</label>
            <input
              id="gymSearch"
              name="gymSearch"
              type="text"
              placeholder="Search gyms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={openAddForm}>
            <Plus size={16} />
            Add Gym
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="stats-row">
        <div className="stat-card tone-blue">
          <div className="stat-icon">
            <Building2 size={18} />
          </div>
          <span>Total Gyms</span>
          <strong>{summary.total}</strong>
          <small className="stat-note">All onboarded gyms</small>
        </div>

        <div className="stat-card tone-green">
          <div className="stat-icon">
            <ShieldCheck size={18} />
          </div>
          <span>Active</span>
          <strong>{summary.active}</strong>
          <small className="stat-note">Currently operational</small>
        </div>

        <div className="stat-card tone-pink">
          <div className="stat-icon">
            <AlertTriangle size={18} />
          </div>
          <span>Suspended</span>
          <strong>{summary.suspended}</strong>
          <small className="stat-note">Temporarily restricted</small>
        </div>

        <div className="stat-card tone-purple">
          <div className="stat-icon">
            <AlertTriangle size={18} />
          </div>
          <span>Expired</span>
          <strong>{summary.expired}</strong>
          <small className="stat-note">Need renewal</small>
        </div>
      </div>

      {showForm && (
        <div className="card fancy-form">
          <div className="form-head">
            <h2>{editingId ? "Edit Gym" : "Add Gym"}</h2>
            <p>Fill in the gym and owner details below.</p>
          </div>

          <form onSubmit={handleSubmit} className="member-form">
            <div className="field">
              <label htmlFor="name">Gym Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter gym name"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="slug">Gym Slug</label>
              <input
                id="slug"
                name="slug"
                type="text"
                value={form.slug}
                onChange={handleChange}
                placeholder="bee-fit"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="ownerName">Owner Name</label>
              <input
                id="ownerName"
                name="ownerName"
                type="text"
                value={form.ownerName}
                onChange={handleChange}
                placeholder="Enter owner name"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="ownerEmail">Owner Email</label>
              <input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                value={form.ownerEmail}
                onChange={handleChange}
                placeholder="Enter owner email"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="ownerPassword">Owner Password</label>
              <input
                id="ownerPassword"
                name="ownerPassword"
                type="password"
                value={form.ownerPassword}
                onChange={handleChange}
                placeholder={editingId ? "Enter new password if changing" : "Enter password"}
                required={!editingId}
              />
            </div>

            <div className="field">
              <label htmlFor="accessStartDate">Access Start Date</label>
              <input
                id="accessStartDate"
                name="accessStartDate"
                type="date"
                value={form.accessStartDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="accessEndDate">Access End Date</label>
              <input
                id="accessEndDate"
                name="accessEndDate"
                type="date"
                value={form.accessEndDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="form-buttons full-row">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Gym" : "Create Gym"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-card">
        {loading ? (
          <p>Loading gyms...</p>
        ) : filteredGyms.length === 0 ? (
          <p>No gyms found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Gym Name</th>
                  <th>Owner</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Access Start</th>
                  <th>Access End</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredGyms.map((gym) => (
                  <tr key={gym.id}>
                    <td>{gym.id}</td>
                    <td>
                      <div className="table-primary-cell">
                        <strong>{gym.name}</strong>
                      </div>
                    </td>
                    <td>{gym.ownerName}</td>
                    <td>{gym.ownerEmail}</td>
                    <td>
                      <span className={`status-badge ${getStatusTone(gym.status)}`}>
                        {gym.status}
                      </span>
                    </td>
                    <td>{formatDate(gym.accessStartDate)}</td>
                    <td>{formatDate(gym.accessEndDate)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => openEditForm(gym)}>
                          Edit
                        </button>
                        <button type="button" className="secondary-btn">
                          Renew
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}