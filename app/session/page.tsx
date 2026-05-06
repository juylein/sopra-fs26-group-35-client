"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button } from "antd";
import Sidebar from "@/components/sidebar";
import { toast, ToastContainer } from "react-toastify";
import TopBar from "@/components/topbar";
import { SessionGetDTO } from "@/types/session";
import { Shelf } from "@/types/shelf";
import { ShelfBook } from "@/types/shelfbook";
import { useSearchParams } from "next/navigation";
import "@/styles/session.css";
import "@/styles/dashboard.css";

const ReadingSessionComponent = () => {
    const router = useRouter();
    const apiService = useApi();
    const searchParams = useSearchParams();
    const autoShelfBookId = searchParams.get("shelfBookId");
    const autoStarted = React.useRef(false);

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

    const [selectedBook, setSelectedBook] = useState<ShelfBook | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [session, setSession] = useState<SessionGetDTO | null>(null);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [startPage, setStartPage] = useState<number>(0);
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
    }, [router]);

    useEffect(() => {
        if (!userId || session) return;
        const fetchShelves = async () => {
            try {
                const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
                setShelves(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchShelves();
    }, [userId, apiService]);

    useEffect(() => {
        if (!autoShelfBookId || shelves.length === 0 || session || autoStarted.current) return;

        const allShelfBooks = shelves.flatMap((s) => s.shelfBooks ?? []);
        const shelfBook = allShelfBooks.find((sb) => String(sb.id) === autoShelfBookId);
        if (!shelfBook) return;

        autoStarted.current = true;

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
    }, [autoShelfBookId, shelves, session, apiService, userId]);

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
        if (!selectedBook) return;
        try {
            const newSession = await apiService.post<SessionGetDTO>(
                `/users/${userId}/sessions`,
                [{ userId, shelfBookId: selectedBook.id }]
            );
            await apiService.put<SessionGetDTO>(`/users/${userId}/sessions/${newSession.id}/started`, {});
            setCurrentPage(selectedBook.pagesRead ?? 0);
            setStartPage(selectedBook.pagesRead ?? 0);
            setSeconds(0);
            setRunning(true);
            setSession(newSession);
        } catch {
            toast.error("Failed creating session");
        }
    };

    const handleFinishSession = async () => {
        setRunning(false);

        if (!session || !selectedBook) {
            toast.error("Failed ending session for the selected book.");
            return;
        }

        try {
            await apiService.put<SessionGetDTO>(`/users/${userId}/sessions/${session.id}/ended`, {});
            await apiService.put(`/users/${userId}/sessions/${session.id}/left`, {
                shelfBookId: selectedBook.id,
                pagesRead: currentPage,
            });

            setSeconds(0);
            setSelectedBook(null);
            setSession(null);

            toast.success(`Session logged! You read for ${formatTime(seconds)}.`, {
                className: "session-toast",
                progressClassName: "session-toast-progress",
            });

            setTimeout(() => router.push("/session"), 1500);
        } catch {
            toast.error("Failed ending session");
        }
    };

    const pct = selectedBook?.book.pages
        ? Math.round((currentPage / selectedBook.book.pages) * 100)
        : 0;

    const allBooks = Array.from(
        new Map(
            shelves
                .flatMap((shelf) => shelf.shelfBooks ?? [])
                .map((sb) => [sb.book.id, sb])
        ).values()
    );

    if (!isAuthorized) return <ToastContainer position="top-center" />;

    return (
        <div className="dashboard-root">
            <Sidebar />
            <TopBar onLogout={handleLogout} />

            <div className="dashboard-main">
                <div className="dashboard-content">

                    <div className="bookshelf-card session-header-card">
                        <div className="bookshelf-title">Reading Session</div>
                        <div className="session-subtitle">Track your reading time and progress for today.</div>
                    </div>

                    {!session && (
                        <div className="db-card">
                            <div className="bottom-card-title session-picker-title">Choose a book to read</div>
                            <div className="session-book-list">
                                {allBooks.map((shelfBook) => (
                                    <div
                                        key={shelfBook.id}
                                        onClick={() => setSelectedBook(shelfBook)}
                                        className={`session-book-row ${selectedBook?.id === shelfBook.id ? "selected" : ""}`}
                                    >
                                        {shelfBook.book.coverUrl ? (
                                            <img
                                                src={shelfBook.book.coverUrl}
                                                alt={shelfBook.book.name}
                                                className="session-book-cover"
                                            />
                                        ) : (
                                            <div className="session-book-cover-placeholder" />
                                        )}
                                        <div className="session-book-info">
                                            <div className="session-book-name">{shelfBook.book.name}</div>
                                            <div className="session-book-author">{shelfBook.book.authors}</div>
                                            <div className="session-book-page">
                                                Page {shelfBook.pagesRead ?? 0} of {shelfBook.book.pages ?? "?"}
                                            </div>
                                        </div>
                                        {selectedBook?.id === shelfBook.id && (
                                            <div className="session-book-selected-badge">Selected ✓</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button
                                className="bookshelf-session-btn-resume session-start-btn"
                                onClick={handleStartSession}
                                disabled={!selectedBook}
                            >
                                Start Session
                            </Button>
                        </div>
                    )}

                    {session && selectedBook && (
                        <>
                            <div className="bookshelf-card">
                                <div className="bookshelf-session">
                                    <div className="session-active-cover">
                                        {selectedBook.book.coverUrl ? (
                                            <img
                                                src={selectedBook.book.coverUrl}
                                                alt={selectedBook.book.name}
                                                className="session-active-cover-img"
                                            />
                                        ) : (
                                            <div className="session-active-cover-empty">No cover</div>
                                        )}
                                    </div>
                                    <div className="bookshelf-session-info">
                                        <div className="bookshelf-session-title">
                                            {selectedBook.book.name} – {selectedBook.book.authors}
                                        </div>
                                        <div className="bookshelf-session-subtitle">
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

                            <div className="dashboard-bottom-row session-stats-row">
                                <div className="bottom-card">
                                    <div className="bottom-card-title">Update your page</div>
                                    <div className="session-page-controls">
                                        <Button className="session-page-btn" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}>−</Button>
                                        <div className="session-page-display">{currentPage}</div>
                                        <Button className="session-page-btn" onClick={() => setCurrentPage((p) => Math.min(selectedBook.book.pages ?? 0, p + 1))}>+</Button>
                                        <span className="session-page-total">of {selectedBook.book.pages ?? 0}</span>
                                    </div>
                                    <div className="bookshelf-progress-bar session-progress-bar">
                                        <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="bookshelf-progress-label">
                                        {(selectedBook.book.pages ?? 0) - currentPage} pages remaining
                                    </div>
                                </div>

                                <div className="bottom-card">
                                    <div className="bottom-card-title">Session stats</div>
                                    <div className="profile-stats session-stats-grid">
                                        {[
                                            [formatTime(seconds), "time today"],
                                            [String(Math.max(0, currentPage - startPage)), "pages this session"],
                                            [String(Math.round((currentPage / (selectedBook.book.pages ?? 0)) * 100)) + "%", "book complete"],
                                            [String((selectedBook.book.pages ?? 0) - currentPage), "pages left"],
                                        ].map(([val, label], i) => (
                                            <div key={i} className="profile-stat-cell">
                                                {val}
                                                <div className="profile-stat-label">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="session-finish-row">
                                <Button
                                    className="bookshelf-session-btn-pause session-finish-btn"
                                    onClick={handleFinishSession}
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

const ReadingSession: React.FC = () => (
    <Suspense fallback={<div>Loading...</div>}>
        <ReadingSessionComponent />
    </Suspense>
);

export default ReadingSession;