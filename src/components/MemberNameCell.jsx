import MemberAvatar from "./MemberAvatar";

export default function MemberNameCell({ member, size = 40 }) {
  return (
    <div className="member-name-cell">
      <MemberAvatar member={member} size={size} />
      <div className="member-name-text">
        <strong>{member?.name || "Unknown Member"}</strong>
      </div>
    </div>
  );
}