import React, { useState, useEffect } from "react";
import api from "../services/api"; 
import { Building2, Shield, AlertTriangle, UserX, Loader2, Calendar } from "lucide-react";

export default function SaasAdminDashboardPage() {
  const [summary, setSummary] = useState({
    totalGyms: 0,
    activeGyms: 0,
    expiringSoon: 0,
    suspendedGyms: 0
  });
  const [gymQueue, setGymQueue] = useState([]); // 🌟 State to store the due soon gyms list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/saas-admin/dashboard-summary");
        
        const total = response.data?.totalRecords ?? 0;
        const renewed = response.data?.renewedCount ?? 0;
        const dueSoon = response.data?.dueSoonCount ?? 0;
        const expired = response.data?.expiredCount ?? 0;

        setSummary({
          totalGyms: total,
          // 🌟 COMBINE COUNTS: A gym that is "due-soon" is still technically an active gym!
          activeGyms: renewed + dueSoon, 
          expiringSoon: dueSoon,
          suspendedGyms: expired,
        });

        // 🌟 SAVE QUEUE ARRAY: Capture the gym items for rendering below
        setGymQueue(response.data?.queue ?? []);

      } catch (err) {
        console.error("Database communication error:", err);
        setError("Could not retrieve real-time data from the database.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardSummary();
  }, []);

  if (loading) {
    return (
      <div className="page-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--muted)' }}>
          <Loader2 className="animate-spin" style={{ width: '2rem', height: '2rem', color: 'var(--accent)' }} />
          <span>Syncing platform database states...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-stack">
        
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1>SaaS Admin Dashboard</h1>
            <p>Manage gyms, renewals, and platform-level operations.</p>
          </div>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "8px" }}>
            <span>{error} (Check backend logs & endpoint routing)</span>
          </div>
        )}

        {/* Dynamic Metrics Cards */}
        <div className="stats-row">
          <div className="stat-card tone-blue">
            <div className="stat-icon"><Building2 style={{ width: "20px", height: "20px" }} /></div>
            <span>Total Gyms</span>
            <strong>{summary.totalGyms}</strong>
            <span className="stat-note">All registered gyms</span>
          </div>

          <div className="stat-card tone-green">
            <div className="stat-icon"><Shield style={{ width: "20px", height: "20px" }} /></div>
            <span>Active Gyms</span>
            <strong>{summary.activeGyms}</strong>
            <span className="stat-note">Live & due-soon subscriptions</span>
          </div>

          <div className="stat-card tone-purple">
            <div className="stat-icon"><AlertTriangle style={{ width: "20px", height: "20px" }} /></div>
            <span>Expiring Soon</span>
            <strong>{summary.expiringSoon}</strong>
            <span className="stat-note">Need renewal attention</span>
          </div>

          <div className="stat-card tone-pink">
            <div className="stat-icon"><UserX style={{ width: "20px", height: "20px" }} /></div>
            <span>Suspended</span>
            <strong>{summary.suspendedGyms}</strong>
            <span className="stat-note">Currently suspended gyms</span>
          </div>
        </div>

        {/* Content Card Info / Gym Queue Table */}
        <div className="card table-card">
          <div className="section-head" style={{ marginBottom: "16px" }}>
            <div>
              <h2>Gyms Awaiting Renewal Attention</h2>
              <p>The following systems are approaching their subscription limit parameters.</p>
            </div>
          </div>

          {gymQueue.length === 0 ? (
            <div className="empty-state-lite">
              <p>No gyms currently require urgent renewal attention.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '12px' }}>Gym Name</th>
                    <th style={{ padding: '12px' }}>Owner</th>
                    <th style={{ padding: '12px' }}>Access End Date</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gymQueue.map((gym) => (
                    <tr key={gym.gymId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{gym.gymName}</td>
                      <td style={{ padding: '12px' }}>{gym.ownerName}</td>
                      <td style={{ padding: '12px', color: 'var(--purple)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar style={{ width: '14px', height: '14px' }} />
                          {gym.accessEndDate}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
                          {gym.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}