import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthProvider";
import { Fingerprint, ShieldCheck, Trash2, Edit2 } from "lucide-react";

const emptyEditForm = {
  id: "",
  memberId: "",
  memberName: "",
  date: "",
  punchIn: "",
  status: "present",
  source: "manual",
  deviceId: "",
  note: "",
};

const emptyDemoForm = {
  memberId: "",
  memberName: "",
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function normalizeTime(timeValue) {
  if (!timeValue) return "";
  return String(timeValue).slice(0, 5);
}

function normalizeRecord(record) {
  return {
    ...record,
    punchIn: normalizeTime(record?.punchIn),
    status: record?.status || "present",
    source: record?.source || "manual",
  };
}

function ConfirmDeleteModal({ open, record, deleting, onCancel, onConfirm }) {
  if (!open || !record) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true">
        <h3>Delete attendance record?</h3>
        <p>
          Delete attendance for <strong>{record.memberName}</strong> on{" "}
          <strong>{formatDate(record.date)}</strong>.
        </p>
        <div className="confirm-modal-actions">
          <button type="button" className="secondary-btn" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="danger-btn" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MembersAttendancePage() {
  const { logout } = useAuth();

  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]); // 🌟 Stores members fetched from database
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [demoForm, setDemoForm] = useState(emptyDemoForm);

  // Load Main Attendance Records
  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (selectedDate) params.date = selectedDate;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;

      const { data } = await api.get("/attendance", { params });
      const normalized = Array.isArray(data) ? data.map(normalizeRecord) : [];
      setRecords(normalized);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await logout();
        return;
      }
      setError(e?.response?.data?.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [logout, selectedDate, statusFilter]);

  // 🌟 Fetch real active gym members for the drop-down menu
  const fetchGymMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const { data } = await api.get("/members");
      setMembers(Array.isArray(data) ? data : data?.content || []);
    } catch (e) {
      console.error("Failed to load members list for dropdown configuration", e);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Trigger member fetching whenever the simulator gateway panel opens up
  useEffect(() => {
    if (showDemoForm) {
      fetchGymMembers();
    }
  }, [showDemoForm, fetchGymMembers]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((record) =>
      [
        record.memberName,
        record.memberId,
        record.status,
        record.source,
        record.deviceId,
        record.punchIn,
        record.note,
        record.date,
      ].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [records, search]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      present: records.filter((r) => r.status === "present").length,
      late: records.filter((r) => r.status === "late").length,
      absent: records.filter((r) => r.status === "absent").length,
    };
  }, [records]);

  const openEditForm = (record) => {
    setEditForm({
      id: record.id || "",
      memberId: record.memberId || "",
      memberName: record.memberName || "",
      date: record.date || "",
      punchIn: normalizeTime(record.punchIn),
      status: record.status || "present",
      source: record.source || "manual",
      deviceId: record.deviceId || "",
      note: record.note || "",
    });
    setShowEditForm(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🌟 Handle Dropdown Selection Map Changes
  const handleDropdownMemberSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setDemoForm(emptyDemoForm);
      return;
    }

    // Find selected member object to pull out names + numeric data fields cleanly
    const targetMember = members.find((m) => String(m.id) === String(selectedId));
    if (targetMember) {
      setDemoForm({
        memberId: targetMember.id,
        memberName: targetMember.name || `${targetMember.firstName || ""} ${targetMember.lastName || ""}`.trim(),
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const payload = {
        memberId: editForm.memberId,
        memberName: editForm.memberName,
        date: editForm.date,
        punchIn: editForm.punchIn || null,
        status: editForm.status,
        source: editForm.source,
        deviceId: editForm.deviceId || null,
        note: editForm.note || null,
        editedBy: "Admin",
      };

      const { data } = await api.put(`/attendance/${editForm.id}`, payload);
      setRecords((prev) => prev.map((r) => (r.id === editForm.id ? normalizeRecord(data) : r)));
      setShowEditForm(false);
      setEditForm(emptyEditForm);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update attendance record.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDemoScan = async (e) => {
  e.preventDefault();
  if (!demoForm.memberId) {
    setError("Please select a valid member from the database list.");
    return;
  }

  try {
    setCreatingDemo(true);
    setError("");

    // The backend expects strictly a Map<String, Long>, meaning ONLY memberId as a pure number!
    const payload = {
      memberId: Number(demoForm.memberId),
    };

    const token = localStorage.getItem("token");
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    // Make the POST request to the clean backend endpoint
    const { data } = await api.post("/attendance/demo-scan", payload, config);

    // Update state table layout seamlessly
    setRecords((prev) => [normalizeRecord(data), ...prev]);
    setDemoForm(emptyDemoForm);
    setShowDemoForm(false);
  } catch (e) {
    console.error("Scan submission error detail:", e.response);
    setError(
      e?.response?.data?.message || 
      "Failed to register simulated biometric scan. Ensure your backend service is reachable."
    );
  } finally {
    setCreatingDemo(false);
  }
};

  const openDeleteModal = (record) => setDeleteTarget(record);
  const closeDeleteModal = () => !deleting && setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      setDeleting(true);
      setError("");
      await api.delete(`/attendance/${deleteTarget.id}`);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete attendance record.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Biometric Attendance Hub</h1>
          <p>Real-time machine tracking synchronization and registration.</p>
        </div>

        <div className="page-actions" style={{ gap: "10px" }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-shell"
            style={{ width: "auto", height: "38px" }}
          />
          <button 
            type="button" 
            onClick={() => setShowDemoForm((prev) => !prev)}
            className="inline-action-btn"
            style={{ backgroundColor: "var(--accent, #6366f1)", color: "#fff", height: "38px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Fingerprint size={16} />
            {showDemoForm ? "Close Simulator" : "Simulate Punch-In"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="stats-row">
        <div className="stat-card tone-blue"><span>Total Records</span><strong>{stats.total}</strong></div>
        <div className="stat-card tone-green"><span>Present</span><strong>{stats.present}</strong></div>
        <div className="stat-card tone-purple"><span>Late</span><strong>{stats.late}</strong></div>
        <div className="stat-card tone-pink"><span>Absent</span><strong>{stats.absent}</strong></div>
      </div>

      {/* 🌟 IMPROVED FORM WITH SELECT DROPDOWN */}
      {showDemoForm && (
        <div className="card fancy-form" style={{ borderLeft: "4px solid var(--accent, #6366f1)" }}>
          <div className="section-head">
            <div>
              <h2>Device Simulator Gateway</h2>
              <p>Simulates cloud webhook signals from hardware scanners using active database entities.</p>
            </div>
          </div>

          <form onSubmit={handleCreateDemoScan} className="form-grid" style={{ marginTop: "16px" }}>
            <div className="field full-row">
              <label htmlFor="memberSelectDropdown">Select Registered Member to Simulate</label>
              <select
                id="memberSelectDropdown"
                value={demoForm.memberId || ""}
                onChange={handleDropdownMemberSelect}
                required
                style={{ width: "100%", height: "42px", padding: "0 10px" }}
              >
                <option value="">-- Choose a member to verify sequence --</option>
                {loadingMembers ? (
                  <option disabled>Loading database members records...</option>
                ) : (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || `${member.firstName || ""} ${member.lastName || ""}`} (ID: {member.id})
                    </option>
                  ))
                )}
              </select>
            </div>

            {demoForm.memberId && (
              <div className="field full-row" style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ padding: "12px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "6px", fontSize: "14px" }}>
                  <strong>Payload Preview:</strong> Sending Request Mapping data for <code>{demoForm.memberName}</code> with Primary Database ID <code>{demoForm.memberId}</code>.
                </div>
              </div>
            )}

            <div className="form-buttons full-row" style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button type="submit" disabled={creatingDemo || !demoForm.memberId} className="inline-action-btn">
                {creatingDemo ? "Transmitting..." : "Trigger Scan Signal"}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowDemoForm(false);
                  setDemoForm(emptyDemoForm);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tables Row Configuration */}
      <div className="card table-card">
        <div className="page-actions" style={{ marginBottom: "16px", justifyContent: "space-between" }}>
          <input
            type="text"
            placeholder="Filter logs by Name, ID, device flag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: "200px" }}>
            <option value="all">All Status Parameters</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        {loading ? (
          <p className="state-text">Synchronizing hardware log sequences...</p>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state-lite">
            <p>No logged check-ins tracked inside selected filter scopes.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Hardware ID</th>
                  <th>Date</th>
                  <th>Punch In</th>
                  <th>Status</th>
                  <th>Verification Engine</th>
                  <th>Device Code</th>
                  <th style={{ textAlign: "right" }}>Action Sequence</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ fontWeight: "500" }}>{record.memberName}</td>
                    <td><code>{record.memberId}</code></td>
                    <td>{formatDate(record.date)}</td>
                    <td><strong>{record.punchIn || "--:--"}</strong></td>
                    <td><span className={`status-badge status-${record.status || "present"}`}>{record.status}</span></td>
                    <td style={{ textTransform: "capitalize" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {record.source === "biometric" && <ShieldCheck size={14} style={{ color: "var(--green)" }} />}
                        {record.source}
                      </span>
                    </td>
                    <td>{record.deviceId || "VIRT-DEV-01"}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="row-actions" style={{ display: "inline-flex", gap: "6px" }}>
                        <button type="button" onClick={() => openEditForm(record)} className="inline-action-btn-lite"><Edit2 size={13} /> Edit</button>
                        <button type="button" className="danger-btn-lite" onClick={() => openDeleteModal(record)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Form Modal Configuration */}
      {showEditForm && (
        <div className="card fancy-form" style={{ marginTop: "16px" }}>
          <div className="section-head">
            <h2>Override Attendance Entry</h2>
            <p>Manual administrative override parameters for biometric discrepancies.</p>
          </div>
          <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "16px" }}>
            <div className="field"><label>Member Name</label><input name="memberName" value={editForm.memberName} readOnly style={{ opacity: 0.7 }} /></div>
            <div className="field"><label>Member ID</label><input name="memberId" value={editForm.memberId} readOnly style={{ opacity: 0.7 }} /></div>
            <div className="field"><label>Date</label><input name="date" type="date" value={editForm.date} onChange={handleEditChange} required /></div>
            <div className="field"><label>Punch In Time</label><input name="punchIn" type="time" value={editForm.punchIn} onChange={handleEditChange} /></div>
            <div className="field">
              <label>Status Classification</label>
              <select name="status" value={editForm.status} onChange={handleEditChange}>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div className="field">
              <label>Verification Pipeline Source</label>
              <select name="source" value={editForm.source} onChange={handleEditChange}>
                <option value="biometric">Biometric Core (Active Machine)</option>
                <option value="manual">Manual Override</option>
                <option value="demo-scan">Simulated Device Hook</option>
              </select>
            </div>
            <div className="field"><label>Assigned Device Terminal Code</label><input name="deviceId" value={editForm.deviceId} onChange={handleEditChange} placeholder="e.g. BIO-TERM-02" /></div>
            <div className="field full-row"><label>Modification Audit Note</label><textarea name="note" rows="2" value={editForm.note} onChange={handleEditChange} placeholder="State override reasons..." /></div>
            <div className="form-buttons full-row" style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={saving} className="inline-action-btn">{saving ? "Saving..." : "Commit Override"}</button>
              <button type="button" className="secondary-btn" onClick={() => { setShowEditForm(false); setEditForm(emptyEditForm); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal open={Boolean(deleteTarget)} record={deleteTarget} deleting={deleting} onCancel={closeDeleteModal} onConfirm={handleDelete} />
    </div>
  );
}