import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  Users,
  Fingerprint,
  CreditCard,
  MessageSquare,
  Send,
  AlertCircle,
} from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function getInitials(name) {
  if (!name) return "M";
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getStatusTone(status) {
  const value = String(status || "").toLowerCase();
  if (value === "paid") return "badge-success";
  if (value === "pending") return "badge-warning";
  return "badge-neutral";
}

function MemberAvatar({ member }) {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(member?.name);
  const src = member?.photoUrl;

  if (!src || hasError) {
    return <div className="member-avatar-fallback">{initials}</div>;
  }

  return (
    <img
      className="member-avatar-image"
      src={src}
      alt={`${member?.name || "Member"} profile`}
      width="40"
      height="40"
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    todayAttendance: 0,
    dueSoon: 0,
    unreadMessages: 0,
  });
  const [dueSoonMembers, setDueSoonMembers] = useState([]);
  const [loadingDueSoon, setLoadingDueSoon] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        setLoadingDueSoon(true);
        setActionMessage({ type: "", text: "" });

        const [statsRes, dueSoonRes] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/due-soon"),
        ]);

        if (!ignore) {
          setStats({
            totalMembers: Number(statsRes.data?.totalMembers || 0),
            todayAttendance: Number(statsRes.data?.todayAttendance || 0),
            dueSoon: Number(statsRes.data?.dueSoon || 0),
            unreadMessages: Number(statsRes.data?.unreadMessages || 0),
          });

          setDueSoonMembers(Array.isArray(dueSoonRes.data) ? dueSoonRes.data : []);
        }
      } catch (error) {
        if (!ignore) {
          setActionMessage({
            type: "error",
            text: "Failed to load dashboard data.",
          });
        }
      } finally {
        if (!ignore) {
          setLoadingDueSoon(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const statCards = useMemo(
    () => [
      {
        title: "Total Members",
        value: stats.totalMembers,
        icon: <Users size={18} />,
        tone: "tone-blue",
        note: "Registered members",
      },
      {
        title: "Today Attendance",
        value: stats.todayAttendance,
        icon: <Fingerprint size={18} />,
        tone: "tone-green",
        note: "Checked in today",
      },
      {
        title: "Due Soon",
        value: stats.dueSoon,
        icon: <CreditCard size={18} />,
        tone: "tone-purple",
        note: "Need attention soon",
      },
      {
        title: "Messages",
        value: stats.unreadMessages,
        icon: <MessageSquare size={18} />,
        tone: "tone-pink",
        note: "Unread conversations",
      },
    ],
    [stats]
  );

  // 🌟 FIXED: Replaced Twilio API call with dynamic Manual WhatsApp Protocol Redirect
  const handleSendWhatsApp = (member) => {
    setActionMessage({ type: "", text: "" });

    if (!member.phone) {
      setActionMessage({
        type: "error",
        text: `Cannot alert ${member.name} because no phone number is recorded.`,
      });
      return;
    }

    // 1. Sanitize the string identifier format to keep only pure numeric country codes
    const cleanNumber = String(member.phone).replace(/\D/g, "");

    // 2. Compose the text body parameters dynamically 
    const message = `Hello *${member.name}*,\n\nThis is a friendly reminder from your gym regarding your monthly membership renewal tracking status.\n\nOur ledger records indicate your monthly fee of *₹${member.monthlyFee}* is due for processing by *${formatDate(member.nextDueDate)}*.\n\nKindly clear your pending dues to maintain uninterrupted access. Thank you!`;

    // 3. Formulate standard browser anchor endpoint layout URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

    // 4. Safely initialize browser redirect routing windows
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    setActionMessage({
      type: "success",
      text: `Opening WhatsApp chat context for ${member.name}.`,
    });
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back to your gym management panel.</p>
        </div>
      </div>

      {actionMessage.text ? (
        <div
          className={`alert ${
            actionMessage.type === "error" ? "alert-error" : "alert-success"
          }`}
        >
          {actionMessage.text}
        </div>
      ) : null}

      <div className="stats-row">
        {statCards.map((item) => (
          <div key={item.title} className={`stat-card ${item.tone}`}>
            <div className="stat-icon">{item.icon}</div>
            <span>{item.title}</span>
            <strong>{item.value}</strong>
            <small className="stat-note">{item.note}</small>
          </div>
        ))}
      </div>

      <div className="card table-card">
        <div className="section-head section-head-spaced">
          <div>
            <h2>Due Within 2 Days</h2>
            <p>Members whose payment due date is close and may need a reminder.</p>
          </div>

          <Link to="/billing" className="inline-link">
            Open Billing Ledger
          </Link>
        </div>

        {loadingDueSoon ? (
          <p className="state-text">Loading due-soon members...</p>
        ) : dueSoonMembers.length === 0 ? (
          <div className="empty-state-lite">
            <AlertCircle size={24} />
            <p>No members with dues in the next 2 days.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Monthly Fee</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Alert</th>
                </tr>
              </thead>

              <tbody>
                {dueSoonMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <MemberAvatar member={member} />
                    </td>
                    <td>
                      <div className="table-primary-cell">
                        <strong>{member.name}</strong>
                      </div>
                    </td>
                    <td>{member.phone}</td>
                    <td>₹{member.monthlyFee}</td>
                    <td>{formatDate(member.nextDueDate)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusTone(
                          member.paymentStatus
                        )}`}
                      >
                        {member.paymentStatus || "pending"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(member)}
                        className="inline-action-btn"
                        style={{ backgroundColor: '#25D366', color: '#fff', border: 'none' }} // WhatsApp color style match
                      >
                        <Send size={15} />
                        Send WhatsApp
                      </button>
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