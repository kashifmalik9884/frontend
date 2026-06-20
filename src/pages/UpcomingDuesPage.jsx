import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MemberNameCell from "../components/MemberNameCell";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
}

export default function UpcomingDuesPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/members", { params: { gymId: "gym-1" } });
        setMembers(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load upcoming dues.");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const upcomingDues = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date();

    return members
      .filter((m) => {
        if (!m.nextDueDate) return false;
        const due = new Date(m.nextDueDate);
        const diffDays = Math.ceil((due - today) / 86400000);
        return diffDays >= 0 && diffDays <= 7;
      })
      .filter((m) => {
        if (!q) return true;
        return [m.name, m.phone, m.paymentStatus]
          .some((v) => String(v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
  }, [members, search]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Upcoming Dues</h1>
          <p>Members whose due date is within the next 7 days.</p>
        </div>
        <div className="page-actions">
          <input
            type="text"
            placeholder="Search dues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <span>Total Due Soon</span>
          <strong>{upcomingDues.length}</strong>
        </div>
      </div>

      <div className="card table-card">
        {loading ? (
          <p>Loading dues...</p>
        ) : upcomingDues.length === 0 ? (
          <p>No upcoming dues found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Next Due</th>
                  <th>Status</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDues.map((member) => (
                  <tr key={member.id}>
                    <td><MemberNameCell member={member} /></td>
                    <td>{member.phone}</td>
                    <td>{formatDate(member.nextDueDate)}</td>
                    <td>{member.paymentStatus || "due"}</td>
                    <td>₹{member.monthlyFee}</td>
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