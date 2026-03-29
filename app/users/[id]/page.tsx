"use client"; 

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import { RotatingLines } from "react-loader-spinner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button, Card, message } from "antd";
import useLocalStorage from "@/hooks/useLocalStorage";

interface UserProfile {
  id: number;
  name: string;
  username: string;
  bio: string;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();

  const [loadingPath, setLoadingPath] = useState<string | null>(null); // Track which path is loading
  const [dashboardData, setDashboardData] = useState<unknown>(null); // State for fetched dashboard data
  const [loadingData, setLoadingData] = useState<boolean>(false); // State for data loading

  const { id } = useParams(); // Get dynamic user ID from URL
  const [timerRunning, setTimerRunning] = useState(false); // State to track if timer is running
  const [seconds, setSeconds] = useState(35 * 60 + 43);
  const [user, setUser] = useState<UserProfile | null>(null); // State for user profile data
  const { clear: clearToken } = useLocalStorage<string>("token", ""); // Hook to manage token in localStorage
  const [messageApi, contextHolder] = message.useMessage(); // Ant Design message API
  
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const data = await apiService.get(`/dashboard?userId=${id}`);
        setDashboardData(data);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoadingData(false);
      }
    };

    if (id) fetchData();
  }, [apiService, id]);

    useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const BOOKS = [
    { title: "War and Peace", color: "#8b4a20" },
    { title: "Pride and Prejudice", color: "#3a5a8b" },
    { title: "Alice in Wonderland", color: "#2a6a3a" },
    { title: "Roald Dahl", color: "#c8a84b" },
    { title: "Frankenstein", color: "#5a5a5a" },
    { title: "Dune", color: "#7a5a20" },
    { title: "Name of the Wind", color: "#3a6a5a" },
    { title: "The Great Gatsby", color: "#3a5a8b" },
    { title: "Twilight", color: "#2a2a2a" },
    { title: "Crime and Punishment", color: "#8b1a1a" },
    { title: "Harry Potter", color: "#2a3a7a" },
    { title: "The Hobbit", color: "#4a6a2a" },
  ];

  const FRIENDS = [
    { name: "Julie", action: "finished and reviewed", book: "Dune", time: "1h ago", color: "#8b1a1a" },
    { name: "Fraia", action: "finished", book: "Lord of the Flies", time: "5h ago", color: "#3a5a8b" },
    { name: "Natalia", action: "started reading", book: "A Gentleman in Moscow", time: "13h ago", color: "#5a5a5a" },
    { name: "Vanessa", action: "finished", book: "And Then There Were None", time: "20h ago", color: "#2a7a4a" },
  ];

  const LB = [
    { rank: 1, name: "Julie", points: 61, color: "#8b1a1a" },
    { rank: 2, name: "Vanessa", points: 58, color: "#2a7a4a" },
    { rank: 3, name: "Fraia", points: 53, color: "#3a5a8b" },
    { rank: 4, name: "Natalia", points: 52, color: "#5a5a5a" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      
      {/* Sidebar*/}
      <Sidebar />

      {/* Top Bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 220, // adjust if you have a sidebar of width 220px
          right: 0,
          height: 60,
          background: "#faf7f2",
          borderBottom: "1px solid #e0d8cc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          zIndex: 1000,
        }}
      >
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search books..."
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid #e0d8cc",
            fontFamily: "inherit",
            fontSize: 14,
            flex: 1,
            maxWidth: 400,
          }}
        />

        {/* Logout Button */}
        <Button
          onClick={() => console.log("Logout clicked")} // replace with logout function
          style={{
            background: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontFamily: "inherit",
            fontSize: 13,
            cursor: "pointer",
            height: 40,
            width: 90,
            marginLeft: 16,
          }}
        >
          Logout
        </Button>
      </div>

      {/* Main Dashboard */}
      <div
        style={{
          marginLeft: 220, // same width as sidebar
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          paddingTop: 0,
        }}
      >

      {/* MAIN CONTENT */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          paddingTop: 0, // remove extra margin/padding
          width: "100%",
        }}
      >
        <div style={{
          fontFamily: "'Philosopher', serif",
          background: "#f5f0e8",
          minHeight: "auto",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}></div>

    <div style={{ fontFamily: "'Philosopher', serif", background: "#f5f0e8", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Profile Card */}
      <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#7a6e5e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff" }}>U</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>User</h2>
            <div style={{ color: "#7a6e5e", fontSize: 14, marginTop: 2 }}>@username · Member since December 16th 2025</div>
          </div>
          <button style={{ background: "#3a3080", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>Edit Profile</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid #e0d8cc", borderRadius: 10, overflow: "hidden", marginTop: 18 }}>
          {[["34", "books read"], ["12,983", "pages read"], ["32", "points"], ["4", "friends"]].map(([val, label], i) => (
            <div key={i} style={{ background: "#f0ebe0", textAlign: "center", padding: "16px 10px", fontSize: 18, fontWeight: 700, borderRight: i < 3 ? "1px solid #e0d8cc" : "none" }}>
              {val}<div style={{ fontSize: 13, fontWeight: 400, color: "#7a6e5e", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookshelf */}
      <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
        <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 14 }}>{user?.name || "User"}'s Bookshelf</div>

        {/* Resume session */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#f0ebe0", border: "1px solid #e0d8cc", borderRadius: 10, padding: "14px 18px", marginBottom: 18 }}>
          <div style={{ width: 42, height: 60, borderRadius: 3, background: "#4a3060", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Wuthering Heights – Emily Brontë</div>
            <div style={{ fontSize: 12, color: "#7a6e5e", marginTop: 2 }}>Session Paused · Page 244/359</div>
            <div style={{ height: 7, background: "#e0d8cc", borderRadius: 4, marginTop: 8 }}>
              <div style={{ height: "100%", width: "68%", background: "#3a3080", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: "#7a6e5e", marginTop: 4 }}>68% complete</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, minWidth: 60, textAlign: "center" }}>{formatTime(seconds)}</div>
          <button
            onClick={() => setTimerRunning((r) => !r)}
            style={{ background: timerRunning ? "#7a2020" : "#2a7a1a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {timerRunning ? "Pause Session" : "Resume Session"}
          </button>
        </div>

        <div style={{ fontSize: 13, color: "#7a6e5e", marginBottom: 14 }}>Sort by: <span style={{ color: "#8b1a1a", fontWeight: 700, cursor: "pointer" }}>Most recently read</span></div>

        {/* Book covers */}
        <div style={{ background: "linear-gradient(to bottom, #f5ede0 80%, #c8a878 80%, #a07840 100%)", borderRadius: 6, padding: "16px 12px 0", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, minHeight: 110 }}>
          {BOOKS.map((b, i) => (
            <div key={i} title={b.title} style={{ width: 52, height: 78, borderRadius: 3, background: b.color, cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", fontSize: 7, color: "#fff", textAlign: "center", padding: "0 2px 4px", transition: "transform 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "none")}
            >
              {b.title.split(" ").slice(0, 2).join(" ")}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#7a6e5e" }}>47 books</div>
      </div>

      {/* Recent Readings */}
      <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Recent Readings</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
          {BOOKS.map((b, i) => (
            <div key={i} title={b.title} style={{ width: 54, height: 78, borderRadius: 3, background: b.color, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", fontSize: 7, color: "#fff", textAlign: "center", padding: "0 2px 3px" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "none")}
            >
              {b.title.split(" ").slice(0, 2).join(" ")}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Friend Activity */}
        <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Friend Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FRIENDS.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: f.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{f.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{f.name}</span>
                  <span style={{ color: "#7a6e5e" }}> {f.action} </span>
                  <span style={{ fontWeight: 700 }}>{f.book}</span>
                </div>
                <div style={{ color: "#7a6e5e", fontSize: 12, whiteSpace: "nowrap" }}>{f.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Leaderboard</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {LB.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, paddingBottom: 10, borderBottom: "1px solid #e0d8cc" }}>
                <div style={{ fontWeight: 700, width: 18, textAlign: "right", color: "#7a6e5e" }}>{r.rank}</div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: r.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>{r.name[0]}</div>
                <div style={{ flex: 1 }}>{r.name}</div>
                <div style={{ fontWeight: 700, color: "#7a6e5e", fontSize: 13 }}>{r.points} points</div>
              </div>
            ))}
            <div style={{ textAlign: "center", color: "#7a6e5e", fontSize: 20, letterSpacing: 2 }}>···</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
              <div style={{ fontWeight: 700, width: 18, textAlign: "right", color: "#7a6e5e" }}>8</div>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7a6e5e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>U</div>
              <div style={{ flex: 1, fontWeight: 700 }}>User</div>
              <div style={{ fontWeight: 700, color: "#7a6e5e", fontSize: 13 }}>32 points</div>
            </div>

        {/* Example: show fetched data */}
        {loadingData ? (
          <p>Loading data...</p>
        ) : (
          <pre>{JSON.stringify(dashboardData, null, 2)}</pre>
        )}
      </div>

      {(loadingPath || loadingData) && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 999,
          }}
        >
          <RotatingLines
            strokeColor="black"
            strokeWidth="10"
            animationDuration="0.6"
            width="50"
            visible={true}
          />
        </div>
      )}

      <ToastContainer toastClassName="custom-toast" />
    </div>
    </div>
  </div>
  </div>
  </div>
  </div>
  );
};

export default Dashboard;