"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button } from "antd";
import Sidebar from "@/components/sidebar";
import { toast, ToastContainer } from "react-toastify";
import TopBar from "@/components/topbar";
import { SessionGetDTO } from "@/types/session";
import {Shelf} from "@/types/shelf";
import { Book } from "@/types/book";
import { ShelfBook } from "@/types/shelfbook";
import { useSearchParams } from "next/navigation";


const ReadingSession: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const searchParams = useSearchParams();

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

    // Book selection
    const [selectedBook, setSelectedBook] = useState<ShelfBook | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [session, setSession] = useState<SessionGetDTO | null>(null)
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [startPage, setStartPage] = useState<number>(0);

    // Timer
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);

    const [isAuthorized, setIsAuthorized] = useState(false);


    const handleLogout = async (): Promise<void> => {
        try {
            if (!userId) { router.push("/login"); return; }
            await apiService.put(`/users/${userId}/logout`, {});
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            clearToken();
            clearId();
            router.push("/login");
        }
    };

    useEffect(() => {
        if (!localStorage.getItem("token")) {
            toast.error("You need to be logged in to access this page.", {
                autoClose: 2000,
                onClose: () => router.push("/login"),
            });
            return;
        }
        setIsAuthorized(true);

        if (session)
        {
            return;
        }

        const fetchShelves = async () => {
          try {
            const data = await apiService.get<Shelf[]>(
              `/users/${userId}/library/shelves`
            );
            setShelves(data);
          } catch (err) {
            console.error(err);
          }
        };
      
        if (userId) fetchShelves();
      }, [userId, session, apiService, router]);

    useEffect(() => {
        const autoShelfBookId = searchParams.get("shelfBookId");
        if (!autoShelfBookId || shelves.length === 0 || session) return;

        const allShelfBooks = shelves.flatMap((s) => s.shelfBooks ?? []);
        const shelfBook = allShelfBooks.find((sb) => String(sb.id) === autoShelfBookId);
        if (!shelfBook) return;

        const autoStart = async () => {
            try {
                const newSession = await apiService.post<SessionGetDTO>(
                    `/users/${userId}/sessions`,
                    [{ userId, shelfBookId: shelfBook.id }]
                );
                await apiService.put<SessionGetDTO>(`/users/${userId}/sessions/${newSession.id}/started`, {});
                setCurrentPage(shelfBook.pagesRead ?? 0);
                setStartPage(shelfBook.pagesRead ?? 0);
                setSeconds(0);
                setRunning(true);
                setSession(newSession);
                setSelectedBook(shelfBook);
            } catch {
                toast.error("Failed to auto-start session.");
            }
        };

        autoStart();
    }, [searchParams, shelves, session]);

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

    const handleStartSession = async () => {
        if (!selectedBook) {
            return
        };

        try {
            const session = await apiService.post<SessionGetDTO>(
                `/users/${userId}/sessions`,
                [
                  {
                    userId: userId,
                    shelfBookId: selectedBook.id
                  }
                ]
              );

              await apiService.put<SessionGetDTO>(`/users/${userId}/sessions/${session.id}/started`, {});

            setCurrentPage(selectedBook.pagesRead ?? 0);
            setStartPage(selectedBook.pagesRead ?? 0);
            setSeconds(0);
            setRunning(true);
            setSession(session);
        }
        catch(error){
            toast.error("Failed creating session");
        }
    };

    const handleFinishSession = async () => {
        setRunning(false);

        if (!session || !selectedBook)
        {
            toast.error("Failed ending session for the selected book.");
            return;
        }

        try {
            await apiService.put<SessionGetDTO>(`/users/${userId}/sessions/${session.id}/ended`, {});
            await apiService.put(`/users/${userId}/sessions/${session.id}/left`, {
                shelfBookId: selectedBook!.id,
                pagesRead: currentPage
            });
            
            toast.success(`Session logged! You read for ${formatTime(seconds)}.`, {
                className: "session-toast", 
                progressClassName: "session-toast-progress",
                onClose: () => router.push("/session"),
            });

            setSeconds(0);
            setSelectedBook(null);
            setSession(null);
        
        } catch (error) {
            toast.error("Failed ending session");
        }
    };

    const pct = selectedBook?.book.pages ? Math.round((currentPage / selectedBook.book.pages) * 100) : 0;
    const allBooks = Array.from(
        new Map(
          shelves
            .flatMap((shelf) => shelf.shelfBooks ?? [])
            .map((sb) => [sb.book.id, sb]) 
        ).values()
      );

    if (!isAuthorized) {
        return <ToastContainer position="top-center" />;
    }

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
                    {!session && (
                        <div className="db-card">
                            <div className="bottom-card-title" style={{ marginBottom: 16 }}>Choose a book to read</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                                {allBooks.map((shelfBook) => (
                                    <div
                                        key={shelfBook.id}
                                        onClick={() => setSelectedBook(shelfBook)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 14,
                                            padding: "12px 16px",
                                            borderRadius: 6,
                                            border: selectedBook?.id === shelfBook.id
                                                ? "2px solid #185FA5"
                                                : "1px solid #d4c9b0",
                                            background: selectedBook?.id === shelfBook.id ? "#f0f4ff" : "white",
                                            cursor: "pointer",
                                        }}
                                        
                                    >
                                        {/* Spine */}
                                    {shelfBook.book.coverUrl ? (
                                        <img
                                            src={shelfBook.book.coverUrl}
                                            alt={shelfBook.book.name}
                                            style={{
                                                width: 36,
                                                height: 52,
                                                objectFit: "cover",
                                                borderRadius: "2px 4px 4px 2px",
                                                boxShadow: "1px 2px 4px rgba(0,0,0,0.2)",
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: 36,
                                                height: 52,
                                                background: "#3a5a8b",
                                                borderRadius: "2px 4px 4px 2px",
                                                flexShrink: 0,
                                                boxShadow: "1px 2px 4px rgba(0,0,0,0.2)",
                                            }}
                                            />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a1a" }}>{shelfBook.book.name}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#8a7d6a" }}>{shelfBook.book.authors}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#8a7d6a", marginTop: 4 }}>
                                            Page {shelfBook.pagesRead ?? 0} of {shelfBook.book.pages ?? "?"} 
                                            </div>
                                        </div>
                                        {selectedBook?.id === shelfBook.id && (
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
                    {session && selectedBook && (
                            <>
                                {/* Timer Card */}
                                <div className="bookshelf-card">
                                    <div className="bookshelf-session">
                                    <div
                                className="bookshelf-session-cover"
                                style={{
                                width: 60,
                                height: 90,
                                borderRadius: 4,
                                overflow: "hidden",
                                background: "#e8e0cc",
                                flexShrink: 0,
                            }}
                            >
                            {selectedBook.book.coverUrl ? (
                                <img
                                src={selectedBook.book.coverUrl}
                                alt={selectedBook.book.name}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                                />
                            ) : (
                                <div
                                style={{
                                    fontSize: 10,
                                    textAlign: "center",
                                    paddingTop: 30,
                                    color: "#8a7d6a",
                                }}
                                >
                                No cover
                                </div>
                            )}
                            </div>
                                    <div className="bookshelf-session-info">
                                        <div className="bookshelf-session-title">
                                            {selectedBook.book.name} – {selectedBook.book.authors}
                                        </div>
                                        <div className="bookshelf-session-subtitle">
                                            {selectedBook.book.name} – {selectedBook.book.authors}
                                            {running ? "Session Active" : "Session Paused"} · Page {currentPage}/{selectedBook.book.pages ?? 0}
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
                                            onClick={() => setCurrentPage((p) => Math.min(selectedBook.book.pages ?? 0, p + 1))}
                                            style={{ fontWeight: 700, fontSize: "1.1rem" }}
                                        >+</Button>
                                        <span style={{ color: "#8a7d6a", fontSize: "0.9rem" }}>of {selectedBook.book.pages ?? 0}</span>
                                    </div>
                                    <div className="bookshelf-progress-bar" style={{ marginBottom: 6 }}>
                                        <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="bookshelf-progress-label">
                                        {( selectedBook.book.pages ?? 0 ) - currentPage} pages remaining
                                    </div>
                                </div>

                                {/* Session Stats */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title">Session stats</div>
                                    <div className="profile-stats" style={{ marginTop: 16, gridTemplateColumns: "1fr 1fr" }}>
                                        {[
                                            [formatTime(seconds), "time today"],
                                            [String(Math.max(0, currentPage - startPage)), "pages this session"],
                                            [String(Math.round((currentPage / (selectedBook.book.pages ?? 0)) * 100)) + "%", "book complete"],
                                            [String( (selectedBook.book.pages ?? 0) - currentPage), "pages left"],
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
            <ToastContainer position="top-center" />
        </div>
    );
};

export default ReadingSession;