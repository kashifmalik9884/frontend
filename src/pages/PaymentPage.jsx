import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthProvider";

export default function PaymentsPage() {
  const { logout } = useAuth();

  // State Management
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentStatus: "paid",
    paymentMethod: "cash",
    notes: "",
  });

  // Fetch initial ledger and fallback membership directory
  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      // Concurrently load payments history and members list
      const [paymentsRes, membersRes] = await Promise.all([
        api.get("/payments"),
        api.get("/members")
      ]);

      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        await logout();
        return;
      }
      setError("Failed to load billing configuration data.");
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Sync member custom base fees when dropdown target changes
  const handleMemberChange = (e) => {
    const mId = e.target.value;
    const selectedMember = members.find((m) => String(m.id) === String(mId));
    
    setForm((prev) => ({
      ...prev,
      memberId: mId,
      amount: selectedMember ? selectedMember.monthlyFee : "",
      dueDate: selectedMember?.nextDueDate || prev.dueDate
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Safe global search tracking over references
  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;

    return payments.filter((p) =>
      [
        p.memberName,
        p.paymentStatus,
        p.paymentMethod,
        String(p.amount),
        p.paymentDate
      ].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [payments, search]);

  // Aggregate Key Metrics
  const totalRevenue = useMemo(() => {
    return filteredPayments
      .filter((p) => p.paymentStatus === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredPayments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberId) {
      setError("Please select a valid member assignment.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        memberId: parseInt(form.memberId, 10),
        amount: parseFloat(form.amount) || 0,
        paymentDate: form.paymentDate,
        dueDate: form.dueDate || null,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim(),
      };

      const { data } = await api.post("/payments", payload);
      
      // Update local state ledger
      setPayments((prev) => [data, ...prev]);
      setShowModal(false);
      
      // Reset form options cleanly
      setForm({
        memberId: "",
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        paymentStatus: "paid",
        paymentMethod: "cash",
        notes: "",
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to process manual transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Billing & Payments Ledger</h1>
          <p>Track history allocations and manually issue custom billing receipts.</p>
        </div>

        <div className="page-actions members-actions">
          <div className="field search-field">
            <label htmlFor="billingSearch">Search Records</label>
            <input
              id="billingSearch"
              type="text"
              placeholder="Search by name, status, method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={() => setShowModal(true)}>
            Record Payment
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <span>Total Collected Revenue</span>
          <strong>₹{totalRevenue.toLocaleString("en-IN")}</strong>
        </div>
        <div className="stat-card">
          <span>Transactions Handled</span>
          <strong>{filteredPayments.length}</strong>
        </div>
      </div>

      {/* Modal Overlay View Wrapper Block */}
      {showModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowModal(false)}>
          <div className="card fancy-form confirm-modal" style={{ maxWidth: "550px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="form-head">
              <h2>Record Manual Payment</h2>
              <p>Log received cash or digital money transfers directly onto member accounts.</p>
            </div>

            <form onSubmit={handleSubmit} className="member-form" style={{ gap: "12px" }}>
              <div className="field">
                <label htmlFor="memberId">Select Gym Member</label>
                <select id="memberId" name="memberId" value={form.memberId} onChange={handleMemberChange} required>
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (ID: {m.id} - Base: ₹{m.monthlyFee})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="amount">Amount Received (₹)</label>
                <input id="amount" name="amount" type="number" value={form.amount} onChange={handleChange} placeholder="Enter value manually" required />
              </div>

              <div className="field">
                <label htmlFor="paymentDate">Payment Transaction Date</label>
                <input id="paymentDate" name="paymentDate" type="date" value={form.paymentDate} onChange={handleChange} required />
              </div>

              <div className="field">
                <label htmlFor="dueDate">Next Invoice Due Date (Optional)</label>
                <input id="dueDate" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
              </div>

              <div className="field">
                <label htmlFor="paymentMethod">Transaction Channel</label>
                <select id="paymentMethod" name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                  <option value="cash">Cash Handover</option>
                  <option value="upi">UPI / Scanner QR</option>
                  <option value="card">Bank Cards</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="paymentStatus">Allocation Status</label>
                <select id="paymentStatus" name="paymentStatus" value={form.paymentStatus} onChange={handleChange}>
                  <option value="paid">Settled / Paid</option>
                  <option value="pending">Awaiting Verification / Pending</option>
                </select>
              </div>

              <div className="field full-row">
                <label htmlFor="notes">Internal Remarks / Notes</label>
                <input id="notes" name="notes" type="text" value={form.notes} onChange={handleChange} placeholder="Reference number, installment counts..." />
              </div>

              <div className="form-buttons full-row" style={{ marginTop: "10px" }}>
                <button type="submit" disabled={saving}>
                  {saving ? "Processing..." : "Commit Transaction"}
                </button>
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centralized Billing History Ledger Display */}
      <div className="card table-card">
        {loading ? (
          <p>Loading historical financial books...</p>
        ) : filteredPayments.length === 0 ? (
          <p>No transactions registered under this workspace search criteria.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Receipt Id</th>
                  <th>Member Reference</th>
                  <th>Amount Remitted</th>
                  <th>Transaction Date</th>
                  <th>Extended Renewal Target</th>
                  <th>Channel</th>
                  <th>Status Status</th>
                  <th>Tracking Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td><strong>{p.memberName}</strong> <span style={{ fontSize: "11px", color: "gray" }}>(Id: {p.memberId})</span></td>
                    <td>₹{p.amount}</td>
                    <td>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "-"}</td>
                    <td>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "Not specified"}</td>
                    <td><span style={{ textTransform: "uppercase", fontSize: "12px" }}>{p.paymentMethod}</span></td>
                    <td>
                      <span className={`status-badge status-${p.paymentStatus || "pending"}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td style={{ color: "gray", fontSize: "13px" }}>{p.notes || "-"}</td>
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