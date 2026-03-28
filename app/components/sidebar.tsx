"use client";

import { useRouter, usePathname, useParams } from "next/navigation";
import {
  HomeOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const userId = params?.id as string;

  const menu = [
    { label: "Dashboard", icon: <HomeOutlined />, path: `/users/${userId}` },
    { label: "Library", icon: <BookOutlined />, path: "/library" },
    { label: "Reading Session", icon: <ClockCircleOutlined />, path: "/session" },
    { label: "Discover", icon: <CompassOutlined />, path: "/discover" },
    { label: "Quiz", icon: <QuestionCircleOutlined />, path: "/quiz" },
    { label: "Friends", icon: <TeamOutlined />, path: "/friends" },
    { label: "Shared Reading Session", icon: <ShareAltOutlined />, path: "/shared" },
  ];

  return (
    <div
      style={{
        width: 220,
        height: "100vh",
        background: "#0d0d0d",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
        position: "fixed",
        left: 0,
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 30 }}>
        <span style={{ color: "#c8a84b" }}>book</span>shelf
      </div>

      {/* Menu */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {menu.map((item) => {
          const active = pathname.startsWith(item.path);

          return (
            <div
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer",
                background: active ? "#1f1f1f" : "transparent",
                transition: "0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#1f1f1f")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = active ? "#1f1f1f" : "transparent")
              }
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 14 }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;