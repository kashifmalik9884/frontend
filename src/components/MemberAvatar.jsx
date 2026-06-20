import { useState } from "react";

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

export default function MemberAvatar({
  member,
  size = 40,
  className = "",
}) {
  const [hasError, setHasError] = useState(false);

  const name = member?.name || "Member";
  const src =
    member?.photoUrl ||
    member?.avatarUrl ||
    member?.imageUrl ||
    member?.profileImageUrl ||
    "";

  const initials = getInitials(name);

  if (!src || hasError) {
    return (
      <div
        className={`member-avatar-fallback ${className}`.trim()}
        style={{ width: size, height: size }}
        title={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} profile`}
      className={`member-avatar-image ${className}`.trim()}
      style={{ width: size, height: size }}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}