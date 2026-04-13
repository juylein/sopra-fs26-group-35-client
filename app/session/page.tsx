"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button } from "antd";
import Sidebar from "@/components/sidebar";
import { toast, ToastContainer } from "react-toastify";
import TopBar from "@/components/topbar";

const BOOKS = [
    { title: "Wuthering Heights", author: "Emily Brontë", color: "#2a2116", page: 244, total: 359 },
    { title: "Dune", author: "Frank Herbert", color: "#7a5a20", page: 180, total: 412 },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", color: "#3a5a8b", page: 90, total: 180 },
    { title: "Crime and Punishment", author: "Fyodor Dostoevsky", color: "#8b1a1a", page: 50, total: 520 },
];

const ReadingSession: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");
    const [user, setUser] = useState<User | null>(null);

    // Book selection
    const [selectedBook, setSelectedBook] = useState<typeof BOOKS[0] | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [sessionStarted, setSessionStarted] = useState(false);

    // Timer
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);

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

    const handleStartSession = () => {
        if (!selectedBook) return;
        setCurrentPage(selectedBook.page);
        setSeconds(0);
        setRunning(true);
        setSessionStarted(true);
    };

    const handleFinishSession = () => {
        setRunning(false);
        // TODO: POST session log to backend
        // e.g. apiService.post(`/users/${userId}/sessions`, {
        //   bookId, startPage, endPage: currentPage, duration: seconds, date: new Date()
        // })
        toast.success(`Session logged! You read for ${formatTime(seconds)}.`, {
            className: "session-toast", 
            progressClassName: "session-toast-progress",
        });
        setSessionStarted(false);
        setSeconds(0);
        setSelectedBook(null);
    };

    const pct = selectedBook ? Math.round((currentPage / selectedBook.total) * 100) : 0;

    return (
        <div className="dashboard-root">
            <Sidebar />

            {/* Top Bar */}
            <TopBar onLogout={handleLogout} />

            <div className="dashboard-main">
                <div className="dashboard-content">

                    {/* Page Title */}
                    <div className="bookshelf-card" style={{ paddingBottom: 8 }}>
                        <div className="bookshelf-title">Reading Session</div>
                        <div className="bookshelf-sort" style={{ marginTop: 0 }}>
                            Track your reading time and progress for today.
                        </div>
                    </div>

                    {/* Book Picker — shown before session starts */}
                    {!sessionStarted && (
                        <div className="db-card">
                            <div className="bottom-card-title" style={{ marginBottom: 16 }}>Choose a book to read</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                                {BOOKS.map((book, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedBook(book)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 14,
                                            padding: "12px 16px",
                                            borderRadius: 6,
                                            border: selectedBook?.title === book.title
                                                ? "2px solid #185FA5"
                                                : "1px solid #d4c9b0",
                                            background: selectedBook?.title === book.title ? "#f0f4ff" : "white",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {/* Spine */}
                                        <div
                                            style={{
                                                width: 36,
                                                height: 52,
                                                background: book.color,
                                                borderRadius: "2px 4px 4px 2px",
                                                flexShrink: 0,
                                                boxShadow: "1px 2px 4px rgba(0,0,0,0.2)",
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a1a" }}>{book.title}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#8a7d6a" }}>{book.author}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#8a7d6a", marginTop: 4 }}>
                                                Page {book.page} of {book.total} · {Math.round((book.page / book.total) * 100)}% complete
                                            </div>
                                        </div>
                                        {selectedBook?.title === book.title && (
                                            <div style={{ color: "#185FA5", fontWeight: 700, fontSize: "0.85rem" }}>Selected ✓</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button
                                className="bookshelf-session-btn-resume"
                                onClick={handleStartSession}
                                disabled={!selectedBook}
                                style={{ width: "100%", height: 44, fontSize: "1rem" }}
                            >
                                Start Session
                            </Button>
                        </div>
                    )}

                    {/* Active Session */}
                    {sessionStarted && selectedBook && (
                        <>
                            {/* Timer Card */}
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
                                    <Button
                                        className={running ? "bookshelf-session-btn-pause" : "bookshelf-session-btn-resume"}
                                        onClick={() => setRunning((r) => !r)}
                                    >
                                        {running ? "Pause" : "Resume"}
                                    </Button>
                                </div>
                            </div>

                            {/* Page Update + Stats */}
                            <div className="dashboard-bottom-row" style={{ alignItems: "flex-start" }}>

                                {/* Update Page */}
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
                                </div>

                                {/* Session Stats */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title">Session stats</div>
                                    <div className="profile-stats" style={{ marginTop: 16, gridTemplateColumns: "1fr 1fr" }}>
                                        {[
                                            [formatTime(seconds), "time today"],
                                            [String(Math.max(0, currentPage - selectedBook.page)), "pages this session"],
                                            [String(Math.round((currentPage / selectedBook.total) * 100)) + "%", "book complete"],
                                            [String(selectedBook.total - currentPage), "pages left"],
                                        ].map(([val, label], i) => (
                                            <div key={i} className="profile-stat-cell">
                                                {val}
                                                <div className="profile-stat-label">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Finish Session */}
                            <div style={{ textAlign: "center", marginTop: 8 }}>
                                <Button
                                    className="bookshelf-session-btn-pause"
                                    onClick={handleFinishSession}
                                    style={{ minWidth: 200, height: 44, fontSize: "1rem" }}
                                >
                                    Finish &amp; Log Session
                                </Button>
                            </div>
                        </>
                    )}

                </div>
            </div>
            <ToastContainer
                position="top-center"
/>
        </div>
    );
};

export default ReadingSession;