"use client";

import { useEffect, useState } from "react";

function initialsFrom(name?: string, email?: string) {
  const src = (name || email || "U").trim();
  return src
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminUserAvatar({
  avatarUrl,
  name,
  email,
  size = 32,
}: {
  avatarUrl?: string | null;
  name?: string;
  email?: string;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [avatarUrl]);
  const initials = initialsFrom(name, email);
  const showImg = Boolean(avatarUrl?.trim()) && !imgFailed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        background: "linear-gradient(135deg, #9333EA 0%, #7C3AED 55%, #6D28D9 100%)",
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- OAuth / CDN URLs
        <img
          src={avatarUrl!.trim()}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: Math.max(10, Math.round(size * 0.35)),
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
