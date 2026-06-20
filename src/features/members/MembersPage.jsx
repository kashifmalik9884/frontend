import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthProvider";

const emptyForm = {
  gymId: "gym-1",
  ownerUid: "demo-uid",
  name: "",
  phone: "",
  monthlyFee: "",
  joiningDate: "",
  billingDay: 1,
  nextDueDate: "",
  lastPaidDate: "",
  paymentStatus: "pending",
  active: true,
  photoUrl: "",
  photoFileId: "",
  biometricUserId: "",
  photo: null,
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function normalizeMember(member) {
  return {
    ...member,
    billingDay:
      member.billingDay ||
      (member.joiningDate ? new Date(member.joiningDate).getDate() : 1),
    paymentStatus: member.paymentStatus || "pending",
    active: member.active ?? true,
  };
}

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function MemberAvatar({ member, size = 40 }) {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(member?.name) || "M";
  const src =
    member?.photoUrl ||
    member?.avatarUrl ||
    member?.imageUrl ||
    member?.profileImageUrl ||
    "";

  if (!src || hasError) {
    return (
      <div
        className="member-avatar-fallback"
        style={{ width: size, height: size }}
        title={member?.name || "Member"}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      className="member-avatar-image"
      src={src}
      alt={`${member?.name || "Member"} profile`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

function ConfirmDeleteModal({
  open,
  member,
  deleting,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !deleting) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, deleting, onCancel]);

  if (!open || !member) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-member-title"
        aria-describedby="delete-member-description"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-member-title">Delete member?</h3>
        <p id="delete-member-description">
          You are about to delete <strong>{member.name}</strong>. This action
          cannot be undone.
        </p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="danger-btn"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { logout } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/members");
      const normalized = Array.isArray(data) ? data.map(normalizeMember) : [];
      setMembers(normalized);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await logout();
        return;
      }
      setError("Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    return () => {
      if (form.photoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(form.photoUrl);
      }
    };
  }, [form.photoUrl]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;

    return members.filter((m) =>
      [
        m.name,
        m.phone,
        m.paymentStatus,
        m.joiningDate,
        m.lastPaidDate,
        m.nextDueDate,
      ].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [members, search]);

  const upcomingDueMembers = useMemo(() => {
    return filteredMembers.filter((m) => {
      if (!m.nextDueDate) return false;
      const due = new Date(m.nextDueDate);
      const today = new Date();

      due.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 2 && diffDays >= 0;
    });
  }, [filteredMembers]);

  const resetForm = () => {
    if (form.photoUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(form.photoUrl);
    }

    setForm(emptyForm);
    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (member) => {
    resetForm();
    setEditingId(member.id);
    setForm({
      gymId: member.gymId || "gym-1",
      ownerUid: member.ownerUid || "demo-uid",
      name: member.name || "",
      phone: member.phone || "",
      monthlyFee: member.monthlyFee ?? "",
      joiningDate: member.joiningDate || "",
      billingDay: member.billingDay || 1,
      nextDueDate: member.nextDueDate || "",
      lastPaidDate: member.lastPaidDate || "",
      paymentStatus: member.paymentStatus || "pending",
      active: member.active ?? true,
      photoUrl: member.photoUrl || "",
      photoFileId: member.photoFileId || "",
      biometricUserId: member.biometricUserId || "",
      photo: null,
    });
    setShowForm(true);
  };

  const openDeleteModal = (member) => {
    setDeleteTarget(member);
  };

  const closeDeleteModal = useCallback(() => {
    if (deleting) return;
    setDeleteTarget(null);
  }, [deleting]);

  const handleDeleteMember = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(`/members/${deleteTarget.id}`);

      setMembers((prev) =>
        prev.filter((member) => member.id !== deleteTarget.id)
      );

      if (editingId === deleteTarget.id) {
        setShowForm(false);
        resetForm();
      }

      setDeleteTarget(null);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await logout();
        return;
      }

      setError(e?.response?.data?.message || "Failed to delete member.");
    } finally {
      setDeleting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (form.photoUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(form.photoUrl);
    }

    const previewUrl = URL.createObjectURL(file);

    setForm((prev) => ({
      ...prev,
      photo: file,
      photoUrl: previewUrl,
      photoFileId: "",
    }));
  };

  const buildMemberFormData = () => {
    const formData = new FormData();

    formData.append("gymId", form.gymId || "gym-1");
    formData.append("ownerUid", form.ownerUid || "demo-uid");
    formData.append("name", form.name.trim());
    formData.append("phone", form.phone.trim());
    formData.append("monthlyFee", String(Number(form.monthlyFee) || 0));
    formData.append("joiningDate", form.joiningDate);
    formData.append("billingDay", String(Number(form.billingDay) || 1));
    formData.append("paymentStatus", form.paymentStatus);
    formData.append("active", form.active ? "true" : "false"); // Clean string boolean conversion
    formData.append("photoFileId", form.photoFileId || "");
    formData.append("biometricUserId", form.biometricUserId || "");

    if (form.nextDueDate) {
      formData.append("nextDueDate", form.nextDueDate);
    }

    if (form.lastPaidDate) {
      formData.append("lastPaidDate", form.lastPaidDate);
    }

    // Only append if it's a genuine binary File upload instance
    if (form.photo instanceof File) {
      formData.append("photo", form.photo);
    } else if (form.photoUrl && !form.photoUrl.startsWith("blob:")) {
      formData.append("photoUrl", form.photoUrl);
    }

    return formData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const formData = buildMemberFormData();

      // Configure explicit headers to bypass automatic JSON fallback mapping rules
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (editingId) {
        const { data } = await api.put(`/members/${editingId}`, formData, config);
        const updatedMember = normalizeMember(data || { id: editingId });

        setMembers((prev) =>
          prev.map((member) =>
            member.id === editingId ? updatedMember : member
          )
        );
      } else {
        const { data } = await api.post("/members", formData, config);
        setMembers((prev) => [...prev, normalizeMember(data)]);
      }

      setShowForm(false);
      resetForm();
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await logout();
        return;
      }
      setError(e?.response?.data?.message || "Failed to save member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Members</h1>
          <p>Manage all registered gym members.</p>
        </div>

        <div className="page-actions members-actions">
          <div className="field search-field">
            <label htmlFor="memberSearch">Search Members</label>
            <input
              id="memberSearch"
              name="memberSearch"
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={openAddForm}>
            Add Member
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <span>Total Members</span>
          <strong>{members.length}</strong>
        </div>

        <div className="stat-card">
          <span>Upcoming Due</span>
          <strong>{upcomingDueMembers.length}</strong>
        </div>
      </div>

      {showForm && (
        <div className="card fancy-form">
          <div className="form-head">
            <h2>{editingId ? "Edit Member" : "Add Member"}</h2>
            <p>Fill in the member details below.</p>
          </div>

          <form onSubmit={handleSubmit} className="member-form">
            <div className="field">
              <label htmlFor="name">Member Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter member name"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Mobile Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter mobile number"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="monthlyFee">Monthly Fee</label>
              <input
                id="monthlyFee"
                name="monthlyFee"
                type="number"
                value={form.monthlyFee}
                onChange={handleChange}
                placeholder="Enter monthly fee"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="joiningDate">Joining Date</label>
              <input
                id="joiningDate"
                name="joiningDate"
                type="date"
                value={form.joiningDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="billingDay">Billing Day</label>
              <select
                id="billingDay"
                name="billingDay"
                value={form.billingDay}
                onChange={handleChange}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="lastPaidDate">Last Paid Date</label>
              <input
                id="lastPaidDate"
                name="lastPaidDate"
                type="date"
                value={form.lastPaidDate}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="nextDueDate">Next Due Date</label>
              <input
                id="nextDueDate"
                name="nextDueDate"
                type="date"
                value={form.nextDueDate}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="paymentStatus">Fees Status</label>
              <select
                id="paymentStatus"
                name="paymentStatus"
                value={form.paymentStatus}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="field checkbox-row full-row">
              <label htmlFor="active" className="checkbox-label">
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={handleChange}
                />
                <span>Active Member</span>
              </label>
            </div>

            <div className="field upload-field full-row">
              <label htmlFor="photoUpload">Member Photo</label>
              <input
                id="photoUpload"
                name="photoUpload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="native-file-input"
              />
              <span className="upload-hint">
                {form.photo
                  ? form.photo.name
                  : form.photoUrl
                  ? "Current photo selected"
                  : "No file selected"}
              </span>
            </div>

            <div className="form-buttons full-row">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Member"
                  : "Create Member"}
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
          <p>Loading members...</p>
        ) : filteredMembers.length === 0 ? (
          <p>No members found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Fee</th>
                  <th>Joining</th>
                  <th>Last Paid</th>
                  <th>Next Due</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>{member.id}</td>
                    <td>
                      <div className="member-name-cell">
                        <MemberAvatar member={member} size={40} />
                        <div className="member-name-text">
                          <strong>{member.name}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{member.phone}</td>
                    <td>₹{member.monthlyFee}</td>
                    <td>{formatDate(member.joiningDate)}</td>
                    <td>{formatDate(member.lastPaidDate)}</td>
                    <td>{formatDate(member.nextDueDate)}</td>
                    <td>
                      <span className={`status-badge status-${member.paymentStatus || "pending"}`}>
                        {member.paymentStatus || "pending"}
                      </span>
                    </td>
                    <td>{member.active ? "Yes" : "No"}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => openEditForm(member)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => openDeleteModal(member)}
                        >
                          Delete
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

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        member={deleteTarget}
        deleting={deleting}
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteMember}
      />
    </div>
  );
}