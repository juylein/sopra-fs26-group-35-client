"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button } from "antd";
import Sidebar from "@/components/sidebar";

// ── Placeholder data (replace with real API calls when backend is ready) ──────

const MY_BOOKS = [
    { title: "Wuthering Heights", author: "Emily Brontë", color: "#2a2116", page: 244, total: 359 },
    { title: "Dune", author: "Frank Herbert", color: "#7a5a20", page: 180, total: 412 },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", color: "#3a5a8b", page: 90, total: 180 },
];

const FRIENDS = [
    { id: 1, name: "Julie", initial: "J", color: "#8b1a1a", online: true },
    { id: 2, name: "Fraia", initial: "F", color: "#3a5a8b", online: true },
    { id: 3, name: "Natalia", initial: "N", color: "#5a5a5a", online: false },
    { id: 4, name: "Vanessa", initial: "V", color: "#2a7a4a", online: false },
];

// Simulated participants in an active session (host + friends who joined)
const ACTIVE_PARTICIPANTS = [
    { name: "Julie", initial: "J", color: "#8b1a1a", book: "Dune", page: 210, total: 412 },
    { name: "Fraia", initial: "F", color: "#3a5a8b", book: "Wuthering Heights", page: 180, total: 359 },
];

type SessionView = "lobby" | "active";

const SharedReadingSession: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");
    const [user, setUser] = useState<User | null>(null);

    // Lobby state
    const [view, setView] = useState<SessionView>("lobby");
    const [selectedBook, setSelectedBook] = useState<typeof MY_BOOKS[0] | null>(null);
    const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    // Timer — shared session means everyone's timer ticks together
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);
    const isHost = true; // TODO: derive from session data once backend exists

    const handleLogout = async (): Promise<void> => {
        try {
            if (!userId) { router.push("/login"); return; }
            await apiService.post(`/users/${userId}/logout`, {});
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            clearToken();
            clearId();
            router.push("/login");
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            if (!localStorage.getItem("token")) {
                router.push("/login");
                return;
            }
            try {
                const fetchedUser = await apiService.get<User>(`/users/${userId}`);
                setUser(fetchedUser);
            } catch (error) {
                if (error instanceof Error) {
                    alert(`Something went wrong while fetching the user:\n${error.message}`);
                } else {
                    console.error("An unknown error occurred while fetching the user.");
                }
            }
        };

        fetchUser();
    }, [apiService, userId, router]);

    // Timer tick
    useEffect(() => {
        if (!running) return;
        const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, [running]);

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
    };

    const toggleFriend = (id: number) => {
        setSelectedFriends((prev) =>
            prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
        );
    };

    const handleStartSession = () => {
        if (!selectedBook || selectedFriends.length === 0) return;
        setCurrentPage(selectedBook.page);
        setSeconds(0);
        setRunning(true);
        setView("active");
        // TODO: POST /sessions/shared { hostId: userId, bookId, invitedFriendIds: selectedFriends }
        // TODO: open WebSocket connection to keep participants in sync
    };

    const handleEndSession = () => {
        setRunning(false);
        // TODO: PATCH /sessions/shared/:sessionId { endedAt, finalPage: currentPage }
        // TODO: close WebSocket
        alert(`Session ended. You read for ${formatTime(seconds)}.`);
        setView("lobby");
        setSeconds(0);
        setSelectedBook(null);
        setSelectedFriends([]);
    };

    const pct = selectedBook ? Math.round((currentPage / selectedBook.total) * 100) : 0;

    return (
        <div className="dashboard-root">
            <Sidebar />

            {/* Top Bar */}
            <div className="dashboard-topbar">
                <input type="text" placeholder="Search books..." className="dashboard-search" />
                <Button className="dashboard-logout-btn" onClick={handleLogout}>Logout</Button>
            </div>

            <div className="dashboard-main">
                <div className="dashboard-content">

                    {/* Page Title */}
                    <div className="bookshelf-card" style={{ paddingBottom: 8 }}>
                        <div className="bookshelf-title">Shared Reading Session</div>
                        <div className="bookshelf-sort" style={{ marginTop: 0 }}>
                            Read at the same time as your friends. Everyone picks their own book.
                        </div>
                    </div>

                    {/* ── LOBBY ─────────────────────────────────────────────── */}
                    {view === "lobby" && (
                        <>
                            <div className="dashboard-bottom-row" style={{ alignItems: "flex-start" }}>

                                {/* Step 1 — pick your book */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title" style={{ marginBottom: 14 }}>
                                        1. Choose your book
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {MY_BOOKS.map((book, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedBook(book)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    padding: "10px 14px",
                                                    borderRadius: 6,
                                                    border: selectedBook?.title === book.title
                                                        ? "2px solid #185FA5"
                                                        : "1px solid #d4c9b0",
                                                    background: selectedBook?.title === book.title ? "#f0f4ff" : "white",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <div style={{
                                                    width: 32,
                                                    height: 46,
                                                    background: book.color,
                                                    borderRadius: "2px 4px 4px 2px",
                                                    flexShrink: 0,
                                                    boxShadow: "1px 2px 4px rgba(0,0,0,0.2)",
                                                }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>{book.title}</div>
                                                    <div style={{ fontSize: "0.8rem", color: "#8a7d6a" }}>{book.author} · pg {book.page}/{book.total}</div>
                                                </div>
                                                {selectedBook?.title === book.title && (
                                                    <div style={{ color: "#185FA5", fontWeight: 700, fontSize: "0.8rem" }}>✓</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2 — invite friends */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title" style={{ marginBottom: 14 }}>
                                        2. Invite friends
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {FRIENDS.map((f) => (
                                            <div
                                                key={f.id}
                                                onClick={() => toggleFriend(f.id)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    padding: "10px 14px",
                                                    borderRadius: 6,
                                                    border: selectedFriends.includes(f.id)
                                                        ? "2px solid #3a6b2a"
                                                        : "1px solid #d4c9b0",
                                                    background: selectedFriends.includes(f.id) ? "#f0fff4" : "white",
                                                    cursor: "pointer",
                                                    opacity: f.online ? 1 : 0.6,
                                                }}
                                            >
                                                <div className="friend-avatar" style={{ background: f.color, flexShrink: 0 }}>
                                                    {f.initial}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>{f.name}</div>
                                                    <div style={{ fontSize: "0.8rem", color: f.online ? "#3a6b2a" : "#8a7d6a" }}>
                                                        {f.online ? "● Online" : "○ Offline"}
                                                    </div>
                                                </div>
                                                {selectedFriends.includes(f.id) && (
                                                    <div style={{ color: "#3a6b2a", fontWeight: 700, fontSize: "0.85rem" }}>✓ Invited</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Start button */}
                            <div style={{ textAlign: "center", marginTop: 4 }}>
                                <Button
                                    className="bookshelf-session-btn-resume"
                                    onClick={handleStartSession}
                                    disabled={!selectedBook || selectedFriends.length === 0}
                                    style={{ minWidth: 240, height: 44, fontSize: "1rem" }}
                                >
                                    Start Shared Session
                                </Button>
                                {(!selectedBook || selectedFriends.length === 0) && (
                                    <div style={{ color: "#8a7d6a", fontSize: "0.8rem", marginTop: 8 }}>
                                        Select a book and at least one friend to continue
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── ACTIVE SESSION ────────────────────────────────────── */}
                    {view === "active" && selectedBook && (
                        <>
                            {/* Your session banner */}
                            <div className="bookshelf-card">
                                <div className="bookshelf-session">
                                    <div className="bookshelf-session-cover" style={{ background: selectedBook.color }} />
                                    <div className="bookshelf-session-info">
                                        <div className="bookshelf-session-title">
                                            {selectedBook.title} – {selectedBook.author}
                                        </div>
                                        <div className="bookshelf-session-subtitle">
                                            {running ? "Session Active" : "Session Paused"} · Page {currentPage}/{selectedBook.total}
                                        </div>
                                        <div className="bookshelf-progress-bar">
                                            <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="bookshelf-progress-label">{pct}% complete</div>
                                    </div>
                                    <div className="bookshelf-timer">{formatTime(seconds)}</div>
                                    {isHost && (
                                        <Button
                                            className={running ? "bookshelf-session-btn-pause" : "bookshelf-session-btn-resume"}
                                            onClick={() => setRunning((r) => !r)}
                                        >
                                            {running ? "Pause" : "Resume"}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="dashboard-bottom-row" style={{ alignItems: "flex-start" }}>

                                {/* Participants */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title" style={{ marginBottom: 14 }}>
                                        Reading now
                                    </div>

                                    {/* Yourself */}
                                    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #e8e0cc" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                            <div className="friend-avatar" style={{ background: "#7a6e5e" }}>
                                                {user?.name?.[0]?.toUpperCase() ?? "U"}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>
                                                    {user?.name ?? "You"} <span style={{ color: "#3a6b2a", fontWeight: 400, fontSize: "0.8rem" }}>(you)</span>
                                                </div>
                                                <div style={{ fontSize: "0.8rem", color: "#8a7d6a" }}>{selectedBook.title}</div>
                                            </div>
                                            <div style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.85rem", color: "#1a1a1a" }}>
                                                pg {currentPage}/{selectedBook.total}
                                            </div>
                                        </div>
                                        <div className="bookshelf-progress-bar">
                                            <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>

                                    {/* Other participants */}
                                    {ACTIVE_PARTICIPANTS.map((p, i) => {
                                        const ppct = Math.round((p.page / p.total) * 100);
                                        return (
                                            <div key={i} style={{ marginBottom: 12 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                                    <div className="friend-avatar" style={{ background: p.color }}>{p.initial}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>{p.name}</div>
                                                        <div style={{ fontSize: "0.8rem", color: "#8a7d6a" }}>{p.book}</div>
                                                    </div>
                                                    <div style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.85rem", color: "#1a1a1a" }}>
                                                        pg {p.page}/{p.total}
                                                    </div>
                                                </div>
                                                <div className="bookshelf-progress-bar">
                                                    <div className="bookshelf-progress-fill" style={{ width: `${ppct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Update your page */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title">Update your page</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                                        <Button
                                            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                            style={{ fontWeight: 700, fontSize: "1.1rem" }}
                                        >−</Button>
                                        <div style={{
                                            border: "1px solid #d4c9b0",
                                            borderRadius: 6,
                                            padding: "6px 20px",
                                            fontSize: "1.3rem",
                                            fontWeight: 700,
                                            background: "white",
                                            minWidth: 70,
                                            textAlign: "center",
                                        }}>
                                            {currentPage}
                                        </div>
                                        <Button
                                            onClick={() => setCurrentPage((p) => Math.min(selectedBook.total, p + 1))}
                                            style={{ fontWeight: 700, fontSize: "1.1rem" }}
                                        >+</Button>
                                        <span style={{ color: "#8a7d6a", fontSize: "0.9rem" }}>of {selectedBook.total}</span>
                                    </div>
                                    <div className="bookshelf-progress-bar" style={{ marginBottom: 6 }}>
                                        <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="bookshelf-progress-label">
                                        {selectedBook.total - currentPage} pages remaining
                                    </div>

                                    {/* Session timer display */}
                                    <div style={{
                                        marginTop: 20,
                                        padding: "14px",
                                        background: "#f0ead8",
                                        borderRadius: 6,
                                        textAlign: "center",
                                    }}>
                                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-1px" }}>
                                            {formatTime(seconds)}
                                        </div>
                                        <div style={{ fontSize: "0.8rem", color: "#8a7d6a", marginTop: 2 }}>
                                            shared session time
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* End session — host only */}
                            {isHost && (
                                <div style={{ textAlign: "center", marginTop: 8 }}>
                                    <Button
                                        className="bookshelf-session-btn-pause"
                                        onClick={handleEndSession}
                                        style={{ minWidth: 200, height: 44, fontSize: "1rem" }}
                                    >
                                        End Session for Everyone
                                    </Button>
                                    <div style={{ color: "#8a7d6a", fontSize: "0.8rem", marginTop: 6 }}>
                                        Only the host can end the session
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SharedReadingSession;