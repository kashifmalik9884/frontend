import {
  Users,
  CreditCard,
  AlertCircle,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    label: "Total Members",
    value: "128",
    tone: "tone-blue",
    icon: Users,
  },
  {
    label: "Active Plans",
    value: "94",
    tone: "tone-purple",
    icon: CreditCard,
  },
  {
    label: "Due Soon",
    value: "18",
    tone: "tone-green",
    icon: AlertCircle,
  },
  {
    label: "Messages",
    value: "7",
    tone: "tone-pink",
    icon: MessageSquare,
  },
];

export default function DashboardHomePage() {
  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back to your gym management panel.</p>
        </div>

        <div className="page-actions">
          <button>+ Add Member</button>
          <button className="secondary-btn">View Reports</button>
        </div>
      </div>

      <div className="stats-row">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div className={`stat-card ${item.tone}`} key={item.label}>
              <div className="stat-icon">
                <Icon size={18} />
              </div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="form-head">
          <h2>Today’s Summary</h2>
          <p>Track members, dues, and messages from one place.</p>
        </div>

        <div
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "16px",
          }}
        >
          <div className="card" style={{ margin: 0 }}>
            <TrendingUp size={18} style={{ marginBottom: "10px" }} />
            <strong style={{ display: "block", fontSize: "1.2rem" }}>+12%</strong>
            <span style={{ color: "var(--muted)" }}>Monthly growth</span>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <strong style={{ display: "block", fontSize: "1.2rem" }}>83%</strong>
            <span style={{ color: "var(--muted)" }}>Renewal rate</span>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <strong style={{ display: "block", fontSize: "1.2rem" }}>24</strong>
            <span style={{ color: "var(--muted)" }}>Check-ins today</span>
          </div>
        </div>
      </div>
    </div>
  );
}