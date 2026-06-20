import React, { useState, useEffect } from "react";
import api from "../services/api"; 
import { Calendar, AlertCircle, CheckCircle, BarChart3, RefreshCw, Loader2, X, FileText } from "lucide-react";

export default function RenewalsPage() {
  const [metrics, setMetrics] = useState({ totalRecords: 0, dueSoonCount: 0, expiredCount: 0, renewedCount: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal workflow tracking actions
  const [selectedGym, setSelectedGym] = useState(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [renewalNote, setRenewalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/saas-admin/renewals");
      
      setMetrics({
        totalRecords: response.data?.totalRecords || 0,
        dueSoonCount: response.data?.dueSoonCount || 0,
        expiredCount: response.data?.expiredCount || 0,
        renewedCount: response.data?.renewedCount || 0,
      });
      setQueue(response.data?.queue || []);
    } catch (err) {
      setError("Failed to fetch live subscription records from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGym || !newEndDate) return;

    try {
      setSubmitting(true);
      await api.post(`/saas-admin/gyms/${selectedGym.gymId}/renew`, {
        newAccessEndDate: newEndDate,
        note: renewalNote
      });

      setSelectedGym(null);
      setNewEndDate("");
      setRenewalNote("");
      await loadDashboardData(); 
    } catch (err) {
      alert(err.response?.data?.message || "Failed to process membership extension request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewLog = (gym) => {
    alert(`Audit Trail Log for ${gym.gymName}:\nOwner: ${gym.ownerName}\nCurrent Access End Target: ${gym.accessEndDate}\nStatus Category: ${gym.status}`);
  };

  if (loading) {
    return (
      <div className="page-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--muted)' }}>
          <Loader2 className="animate-spin text-indigo-500" style={{ width: '2rem', height: '2rem', color: 'var(--accent)' }} />
          <span>Syncing platform subscription maps...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-stack">
        
        {/* 📋 Header Section using .page-header */}
        <div className="page-header">
          <div>
            <h1>Renewals</h1>
            <p>Track gym subscriptions that need renewal attention.</p>
          </div>
        </div>

        {/* ⚠️ Alert Prompt Container */}
        {error && (
          <div className="alert alert-error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* 📊 Unified Metrics Grid Row using .stats-row and .stat-card */}
        <div className="stats-row">
          {/* Card 1 */}
          <div className="stat-card tone-blue">
            <div className="stat-icon">
              <BarChart3 style={{ width: '20px', height: '20px' }} />
            </div>
            <span>Total Records</span>
            <strong>{metrics.totalRecords}</strong>
            <span className="stat-note">Renewal overview</span>
          </div>

          {/* Card 2 */}
          <div className="stat-card tone-purple">
            <div className="stat-icon">
              <Calendar style={{ width: '20px', height: '20px' }} />
            </div>
            <span>Due Soon</span>
            <strong>{metrics.dueSoonCount}</strong>
            <span className="stat-note">Renew within a few days</span>
          </div>

          {/* Card 3 */}
          <div className="stat-card tone-pink">
            <div className="stat-icon">
              <AlertCircle style={{ width: '20px', height: '20px' }} />
            </div>
            <span>Expired</span>
            <strong>{metrics.expiredCount}</strong>
            <span className="stat-note">Already expired access</span>
          </div>

          {/* Card 4 */}
          <div className="stat-card tone-green">
            <div className="stat-icon">
              <CheckCircle style={{ width: '20px', height: '20px' }} />
            </div>
            <span>Renewed</span>
            <strong>{metrics.renewedCount}</strong>
            <span className="stat-note">Recently extended</span>
          </div>
        </div>

        {/* 📋 Renewal Data Table Card using .card and .table-card */}
        <div className="card table-card">
          <div className="section-head section-head-spaced" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Renewal Queue</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>Review gyms that need subscription updates or follow-up.</p>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="empty-state-lite">
              <p>No active subscription tracking requests found.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Gym Name</th>
                    <th>Owner</th>
                    <th>Access End Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.gymId}>
                      <td className="table-primary-cell">
                        <strong>{item.gymName}</strong>
                      </td>
                      <td>{item.ownerName}</td>
                      <td>{item.accessEndDate || "N/A"}</td>
                      <td>
                        <span className={`status-badge ${
                          item.status === "due-soon" ? "badge-warning" : 
                          item.status === "expired" ? "badge-neutral" : "badge-success"
                        }`} style={{
                          backgroundColor: item.status === "expired" ? 'rgba(239, 68, 68, 0.14)' : undefined,
                          color: item.status === "expired" ? 'var(--danger)' : undefined
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            onClick={() => setSelectedGym(item)}
                            className="inline-action-btn"
                          >
                            Renew Now
                          </button>
                          <button 
                            onClick={() => handleViewLog(item)}
                            className="inline-action-btn secondary-btn"
                          >
                            <FileText style={{ width: '14px', height: '14px' }} />
                            View Log
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

      {/* 🛠️ Action Modal Popup System matching App Design Architecture */}
      {selectedGym && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'grid', placeItems: 'center', padding: '16px',
          backgroundColor: 'rgba(4, 8, 16, 0.75)', backdropFilter: 'blur(12px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', position: 'relative', animation: 'fadeInUp 0.25s ease both' }}>
            
            {/* Close Cross Anchor */}
            <button 
              onClick={() => setSelectedGym(null)}
              className="secondary-btn"
              style={{
                position: 'absolute', top: '20px', right: '20px',
                width: '36px', height: '36px', padding: 0,
                display: 'grid', placeItems: 'center', borderRadius: '10px'
              }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
            
            <div className="form-head" style={{ marginBottom: '20px' }}>
              <h2>Extend Access Term</h2>
              <p>Updating metrics access constraints for <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{selectedGym.gymName}</span>.</p>
            </div>

            <form onSubmit={handleRenewSubmit} className="member-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 0 }}>
              <div className="field">
                <label>New Access Termination End Date</label>
                <input 
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  style={{ width: '100%', colorScheme: 'dark' }}
                />
              </div>

              <div className="field">
                <label>Internal Audit Ledger Notes</label>
                <textarea 
                  rows="3"
                  placeholder="E.g., Received advance draft ledger allocation authorization tracking code..."
                  value={renewalNote}
                  onChange={(e) => setRenewalNote(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(15, 23, 42, 0.92)',
                    color: 'white', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '12px 14px', outline: 'none',
                    fontFamily: 'inherit', fontSize: '0.95rem', resize: 'none'
                  }}
                />
              </div>

              <div className="form-buttons" style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedGym(null)}
                  className="secondary-btn"
                  style={{ width: '100%', padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {submitting && <RefreshCw className="animate-spin" style={{ width: '14px', height: '14px' }} />}
                  {submitting ? "Processing..." : "Confirm Extension"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}