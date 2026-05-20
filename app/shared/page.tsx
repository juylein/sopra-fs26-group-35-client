"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Modal } from "antd";
import Sidebar from "@/components/sidebar";
import { toast, ToastContainer } from "react-toastify";
import TopBar from "@/components/topbar";
import { Shelf } from "@/types/shelf";
import { ShelfBook } from "@/types/shelfbook";
import { useHandleErrorMessage } from "@/hooks/useHandleErrorMessage";
import { BookPicker } from "@/components/shared/bookPicker";
import { useNotificationContext } from "@/components/context/notificationProvider";
import { SelectBookModal } from "@/components/shared/selectBookModal";
import { NotificationEventType } from "@/types/notificationEvent";
import { SessionParticipant } from "@/types/sessionParticipant";
import { SessionGetDTO } from "@/types/session";
import { SessionParticipantGetDTO } from "@/types/sessionParticipantGetDTO";

type SessionView = "lobby" | "active";

const SharedReadingSession: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const { handleErrorMessage } = useHandleErrorMessage();
    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");
    const [user, setUser] = useState<User | null>(null);
    const { notificationQueue, popNotification } = useNotificationContext();

    // Lobby state
    const [view, setView] = useState<SessionView>("lobby");
    const [selectedBook, setSelectedBook] = useState<ShelfBook | null>(null);
    const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [friends, setFriends] = useState<User[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showBookModal, setShowBookModal] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Timer — shared session means everyone's timer ticks together
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);

    const [isAuthorized, setIsAuthorized] = useState(false);

    const [activeParticipants, setActiveParticipants] = useState<SessionParticipant[]>([]);

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

    const fetchShelves = useCallback(async () => {
        if (!userId) return;

        try {
            const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
            setShelves(data);
        } catch (error) {
            handleErrorMessage(error);
        }
    }, [userId, handleErrorMessage, apiService]);


    useEffect(() => {
        if (!localStorage.getItem("token")) {
            toast.error("You need to be logged in to access this page.", {
                autoClose: 2000,
                onClose: () => router.push("/login"),
            });
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    // Timer tick
    useEffect(() => {
        if (!running) return;
        const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, [running]);

    useEffect(() => {
        const fetchFriends = async () => {
            if (!userId) return;

            try {
                const fetchedUser = await apiService.get<User>(`/users/${userId}`);
                setUser(fetchedUser);
                setFriends(fetchedUser.friends ?? []);
            } catch (error) {
                console.error(error);
            }
        };

        void fetchFriends();
        void fetchShelves();
    }, [userId]);

    useEffect(() => {
        const notification = popNotification();

        if (!notification) return;
        
        switch (notification.type) {
            case NotificationEventType.SHARED_SESSION_START:
                if (!sessionId && notification.payload.sessionId) {
                    setSessionId(notification.payload.sessionId);
                }
                break;

            case NotificationEventType.SHARED_SESSION_JOIN:
                const shelfBook = notification.payload.shelfBook;
                const p = friends.find(x => String(x.id) === String(notification.payload.from));

                const newParticipant: SessionParticipant = {
                    id: String(notification.payload.from),
                    name: p?.name ?? "Unknown",
                    initial: p?.username?.substring(0, 2).toUpperCase() ?? "??",
                    color: '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0'), // generate random color
                    book: shelfBook.book.name,
                    page: shelfBook.pagesRead ?? 0,
                    total: shelfBook.book.pages ?? 0,
                }

                setActiveParticipants(prev => [...prev, newParticipant]);
                break;
            case NotificationEventType.SHARED_SESSION_PAGE:
                setActiveParticipants(prev =>
                    prev.map(participant =>
                        String(participant.id) === String(notification.payload.from)
                            ? { ...participant, page: notification.payload.numberOfPages ?? 0 }
                            : participant
                    ));  
                break;
            case NotificationEventType.SHARED_SESSION_QUIT:
                setActiveParticipants(prev => prev.filter(x => String(x.id) !== String(notification.payload.from)))
                break;
        }
    }, [notificationQueue, popNotification]);

    useEffect(() => {
        if (sessionId) {
            setShowBookModal(true);
        }
    }, [sessionId]);

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

    const handleStartSession = async (shelfBook: ShelfBook | null) => {
        if (!shelfBook) return;
        setCurrentPage(shelfBook.pagesRead ?? 0);
        setSeconds(0);
        setRunning(true);
        setView("active");
    };

    const handleEndSession = async () => {
        setRunning(false);

        await apiService.put(`/users/${userId}/sessions/${sessionId}/left`,  {
            shelfBookId:  selectedBook?.id,
            pagesRead: currentPage,
        });

        toast.success(`Session ended. You read for ${formatTime(seconds)}.`, {
            className: "session-toast",
            progressClassName: "session-toast-progress",
        });
        setView("lobby");
        setSeconds(0);
        setSelectedBook(null);
        setSelectedFriends([]);
        setActiveParticipants([]);
        setSessionId(null);
        await fetchShelves();
    };


    const handleSessionChangePage = async (nPages: number) => { 
        await apiService.put(`/users/${userId}/sessions/${sessionId}/readPage`,  { numberOfPages: nPages }); 
    }

    const pct = selectedBook?.book.pages
        ? Math.round((currentPage / selectedBook.book.pages) * 100)
        : 0;

    if (!isAuthorized) {
        return <ToastContainer position="top-center" />;
    }

    const allBooks = Array.from(
        new Map(
            shelves
                .flatMap((shelf) => shelf.shelfBooks ?? [])
                .map((sb) => [sb.book.id, sb])
        ).values()
    );

    return (
        <div className="dashboard-root">
            <Sidebar disabled={view === "active" } />

            {/* Top Bar */}
            <TopBar onLogout={handleLogout} />

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
                            <div
                                className="dashboard-bottom-row"
                                style={{ alignItems: "flex-start" }}
                            >
                                {/* ───────────── STEP 1 ───────────── */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title" style={{ marginBottom: 14 }}>
                                        1. Choose your book
                                    </div>
                                    <BookPicker
                                        selectedBook={selectedBook}
                                        allBooks={allBooks}
                                        setSelectedBook={setSelectedBook}
                                    />
                                </div>

                                {/* ───────────── STEP 2 ───────────── */}
                                <div className="bottom-card">
                                    <div className="bottom-card-title" style={{ marginBottom: 14 }}>
                                        2. Invite friends
                                    </div>

                                    {/* IMPORTANT: this div MUST be closed before button */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {friends.map((f) => {
                                            const isSelected = selectedFriends.includes(f.id);

                                            return (
                                                <div
                                                    key={f.id}
                                                    onClick={() => toggleFriend(f.id)}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 12,
                                                        padding: "10px 14px",
                                                        borderRadius: 6,
                                                        border: isSelected
                                                            ? "2px solid #3a6b2a"
                                                            : "1px solid #d4c9b0",
                                                        background: isSelected ? "#f0fff4" : "white",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <div
                                                        className="friend-avatar"
                                                        style={{ background: "#2e7d32" }}
                                                    >
                                                        {f.username?.substring(0, 2).toUpperCase()}
                                                    </div>

                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700 }}>
                                                            {f.name ?? f.username}
                                                        </div>

                                                        <div style={{ fontSize: "0.8rem", color: "#8a7d6a" }}>
                                                            @{f.username}
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <div style={{ color: "#3a6b2a", fontWeight: 700 }}>
                                                            ✓ Invited
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ───────────── START BUTTON (OUTSIDE ROW) ───────────── */}
                            <div style={{ textAlign: "center", marginTop: 16 }}>
                                <Button
                                    className="bookshelf-session-btn-resume"
                                    onClick={async () => {
                                        try {
                                            const session = await apiService.post<SessionGetDTO>(`/users/${userId}/sessions/invitations`,  {
                                                participantIds: selectedFriends,
                                                shelfBookId: selectedBook!.id,
                                            }); 
                                            handleStartSession(selectedBook);
                                            setSessionId(`${session.id}`);
                                        } catch (error) {
                                            handleErrorMessage(error);
                                        }
                                    }}
                                    disabled={!selectedBook || selectedFriends.length === 0}
                                    style={{ minWidth: 240, height: 44 }}
                                >
                                    Start Shared Session
                                </Button>
                                {sessionId && showBookModal &&(
                                    <SelectBookModal
                                        sessionId={sessionId}
                                        userId={userId}
                                        handleStartSession={async book => {
                                            setSelectedBook(book);
                                            const participants = await apiService.get<SessionParticipantGetDTO[]>(`/users/${userId}/sessions/${sessionId}/participants`);

                                            const actives: SessionParticipant[] = participants
                                                .filter(x => String(x.user.id) !== userId)
                                                .map(x => {
                                                    const isFriend = !!friends.find(p => String(p.id) === String(x.user.id));
                                                    const name = x.user.name ?? "";
                                                    const username = x.user.username ?? "";

                                                    return {
                                                        id: String(x.user.id),
                                                        name: isFriend ? name : "Unknown",
                                                        initial: isFriend ? username.substring(0, 2).toUpperCase() : "??",
                                                        color: '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0'), // generate random color
                                                        book: x.book.name,
                                                        page: x.pagesRead ?? 0,
                                                        total: x.book.pages ?? 0,
                                                    }
                                            });
                                            
                                            setActiveParticipants(actives)
                                            await handleStartSession(book);

                                        }}
                                        onClose={() => {
                                            setSessionId(null);
                                            setShowBookModal(false);
                                        }}
                                        
                                    />
                                )}
                                
                                {(!selectedBook || selectedFriends.length === 0) && (
                                    <div style={{ color: "#8a7d6a", fontSize: "0.8rem", marginTop: 8 }}>
                                        Select a book and at least one friend
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
                                    <div className="bookshelf-session-cover">
                                        {selectedBook.book.coverUrl ? (
                                            <img
                                                src={selectedBook.book.coverUrl}
                                                alt={selectedBook.book.name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                        ) : (
                                            <div style={{ width: "100%", height: "100%", background: "#3a5a8b" }} />
                                        )}
                                    </div>
                                    <div className="bookshelf-session-info">
                                        <div className="bookshelf-session-title">
                                            {selectedBook.book.name} – {selectedBook.book.authors}
                                        </div>
                                        <div className="bookshelf-session-subtitle">
                                            {running ? "Session Active" : "Session Paused"} · Page {currentPage}{selectedBook.book.pages ? `/${selectedBook.book.pages}` : ""}
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
                                                <div style={{ fontSize: "0.8rem", color: "#8a7d6a" }}>{selectedBook.book.name}</div>
                                            </div>
                                            <div style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.85rem", color: "#1a1a1a" }}>
                                                pg {currentPage}{selectedBook.book.pages ? `/${selectedBook.book.pages}` : ""}
                                            </div>
                                        </div>
                                        <div className="bookshelf-progress-bar">
                                            <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>

                                    {/* Other participants */}
                                    {activeParticipants.map((p, i) => {
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
                                                        pg {p.page}{p.total > 0 ? `/${p.total}` : ""}
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
                                            onClick={async () => {
                                                const nPages = selectedBook.book.pages
                                                    ? Math.min(selectedBook.book.pages, currentPage - 1)
                                                    : currentPage - 1;
                                                setCurrentPage(nPages);
                                                await handleSessionChangePage(nPages);
                                            }}
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
                                            onClick={async () => {
                                                const nPages = selectedBook.book.pages
                                                    ? Math.min(selectedBook.book.pages, currentPage + 1)
                                                    : currentPage + 1;
                                                setCurrentPage(nPages);
                                                await handleSessionChangePage(nPages);
                                            }}
                                            style={{ fontWeight: 700, fontSize: "1.1rem" }}
                                        >+</Button>
                                        <span style={{ color: "#8a7d6a", fontSize: "0.9rem" }}>of {selectedBook.book.name}</span>
                                    </div>
                                    <div className="bookshelf-progress-bar" style={{ marginBottom: 6 }}>
                                        <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="bookshelf-progress-label">
                                        {selectedBook.book.pages ?? 0 - currentPage} pages remaining
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
                                            session time
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* End session */}
                            <div style={{ textAlign: "center", marginTop: 8 }}>
                                <Button
                                    className="bookshelf-session-btn-pause"
                                    onClick={() => setIsModalOpen(true)}
                                    style={{ minWidth: 200, height: 44, fontSize: "1rem" }}
                                >
                                    Quit Session
                                </Button>
                                <div style={{ color: "#8a7d6a", fontSize: "0.8rem", marginTop: 6 }}>
                                    Say goodbye to your friends!
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>
            <Modal
                title="Leave session?"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="confirm"
                        type="primary"
                        danger
                        onClick={async () => {
                            await handleEndSession();
                            setIsModalOpen(false);
                        }}
                    >
                        Yes, finish session
                    </Button>,
                ]}
>
                 <p>Are you sure you want to leave this reading session?</p>
            </Modal>
            <ToastContainer position="top-center" />
        </div>
    );
};

export default SharedReadingSession;