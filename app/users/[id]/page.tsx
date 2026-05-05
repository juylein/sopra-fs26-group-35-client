"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button } from "antd";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import "@/styles/dashboard.css"
import { Shelf } from "@/types/shelf";
import { Book } from "@/types/book";
import { ToastContainer } from "react-toastify";

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

const BOOKS_PER_ROW = 18;
const SHELF_MAX = BOOKS_PER_ROW * 3;
const RECENT_MAX = BOOKS_PER_ROW * 1;

const Dashboard: React.FC = () => {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const apiService = useApi();
    const [user, setUser] = useState<User | null>(null);

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

    // Shelves state
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { value: savedShelfId, set: saveShelfId } = useLocalStorage<number | null>("dashboard_shelf_id", null);
    const [selectedShelfId, setSelectedShelfId] = useState<number | null>(savedShelfId);

    const [latestSession, setLatestSession] = useState<{ id: number; bookId: string; bookTitle: string; coverUrl: string | null; } | null>(null);
    const [latestSessionEmpty, setLatestSessionEmpty] = useState(false);
    const [resumeLoading, setResumeLoading] = useState(false);

    // Compute selected shelf and books to display based on selectedShelfId
    const selectedShelf = shelves.find((s) => s.id === selectedShelfId) ?? null;
    const displayBooks = selectedShelf?.shelfBooks.map(sb => sb.book) ?? [];

    // Derive stats from the "Read" shelf
    const readShelf = shelves.find((s) => s.name === "Read") ?? null;
    const booksRead = readShelf?.shelfBooks.length ?? 0;
    const pagesRead = shelves
        .flatMap((s) => s.shelfBooks ?? [])
        .reduce((sum, sb) => sum + (sb.pagesRead ?? 0), 0);

    // Fetch shelves on component mount
    useEffect(() => {
        const fetchShelves = async () => {
            if (!userId) return;
            try {
                const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
                setShelves(data);

                // Always default to "Read" if nothing is saved yet
                setSelectedShelfId((prev) => {
                    if (prev !== null) return prev;
                    return data.find((s) => s.name === "Read")?.id ?? null;
                });
            } catch (error) {
                console.error("Failed to fetch shelves", error);
            }
        };
        fetchShelves();
    }, [apiService, userId]);

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const data = await apiService.get<{ id: number; bookId: string; bookTitle: string; coverUrl: string | null }>(
                    `/users/${userId}/sessions/latest`
                );
                setLatestSession(data);
            } catch {
                setLatestSessionEmpty(true);
            }
        };
        if (userId) fetchLatest();
    }, [userId, apiService]);

    const handleResume = async () => {
        if (!latestSession) return;
        setResumeLoading(true);
        try {
            const allShelfBooks = shelves.flatMap((s) => s.shelfBooks ?? []);
            const shelfBook = allShelfBooks.find((sb) => String(sb.book.id) === String(latestSession.bookId));

            if (!shelfBook) {
                alert("Could not find this book in your shelves.");
                return;
            }

            const newSession = await apiService.post<{ id: number }>(
                `/users/${userId}/sessions`,
                [{ userId, shelfBookId: shelfBook.id }]
            );
            await apiService.put(`/users/${userId}/sessions/${newSession.id}/started`, {});
            router.push(`/session?shelfBookId=${shelfBook.id}`);
        } catch {
            alert("Failed to start session.");
        } finally {
            setResumeLoading(false);
        }
    };

    // Handler for shelf change
    const handleShelfSelect = (shelf: Shelf) => {
        setSelectedShelfId(shelf.id);
        saveShelfId(shelf.id);
        setDropdownOpen(false);
    };

    const handleLogout = async (): Promise<void> => {
        try {
            if (!userId) {
                router.push("/login");
                return;
            }
            await apiService.put(`/users/${id}/logout`, {});
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
            if (!userId) return;

            try {
                const fetchedUser = await apiService.get<User>(`/users/${id}`);
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
    }, [apiService, id, userId, router]);

    return (
        <div className="dashboard-root">
            <ToastContainer position="top-center" />
            <Sidebar />

            {/* Top Bar */}
            <TopBar title="My Dashboard" onLogout={handleLogout} />

            {/* Main Content */}
            <div className="dashboard-main">
                <div className="dashboard-content">

                    {/* Profile Card */}
                    <div className="db-card">

                        {/* Row 1: avatar + name/meta + edit button */}
                        <div className="profile-header">
                            <div className="profile-avatar">
                                {user?.name?.[0]?.toUpperCase() ?? "U"}
                            </div>
                            <div className="profile-info">
                                <h2 className="profile-name">{user?.name ?? "..."}</h2>
                                <div className="profile-meta">
                                    @{user?.username ?? "..."} · Member since{" "}
                                    {user?.creationDate
                                        ? new Date(user.creationDate).toLocaleDateString("en-US", {
                                            year: "numeric", month: "long", day: "numeric",
                                        })
                                        : "..."}
                                </div>
                            </div>
                            {id === userId && (
                                <Button
                                    className="profile-edit-btn"
                                    onClick={() => router.push(`/users/${id}/edit`)}
                                >
                                    Edit Profile
                                </Button>
                            )}
                        </div>

                        {/* Row 2: bio */}
                        <div className="profile-bio-row">
                            <div className="profile-bio-label">Bio:</div>
                            <div className="profile-bio-content">
                                {user?.bio ? (
                                    user.bio
                                ) : (
                                    <span style={{ color: "#bbb" }}>
                                        No bio yet —{" "}
                                        <span className="profile-add-link" onClick={() => router.push(`/users/${id}/edit`)}>
                                            add one
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Row 3: genres */}
                        <div className="profile-bio-row">
                            <div className="profile-bio-label">Favourite genre:</div>
                            <div className="profile-bio-content">
                                {user?.genres ? (
                                    user.genres.join(", ")
                                ) : (
                                    <span style={{ color: "#bbb" }}>
                                        No favourite genres yet —{" "}
                                        <span className="profile-add-link" onClick={() => router.push(`/users/${id}/edit`)}>
                                            add them
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Row 4: stat cells */}
                        <div className="profile-stats">
                            {[
                                [booksRead.toString(), "books read"],
                                [pagesRead.toLocaleString(), "pages read"],
                                ["32", "points"],
                                ["4", "friends"],
                            ].map(([val, label], i) => (
                                <div key={i} className="profile-stat-cell">
                                    {val}
                                    <div className="profile-stat-label">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bookshelf */}
                    <div className="bookshelf-card">
                        {/* Bookshelf header */}
                        <div className="bookshelf-header">
                            <div className="bookshelf-title">{user?.name ?? "User"}&apos;s Bookshelf</div>
                        </div>

                        <div className="bookshelf-session">
                            {latestSessionEmpty ? (
                                <div className="bookshelf-session-empty">
                                    No reading session yet — start one to see it here.
                                </div>
                            ) : latestSession ? (
                                <>
                                    <div className="bookshelf-session-cover">
                                        {latestSession.coverUrl && (
                                            <img
                                                src={latestSession.coverUrl}
                                                alt={latestSession.bookTitle}
                                                className="bookshelf-session-cover-img"
                                            />
                                        )}
                                    </div>
                                    <div className="bookshelf-session-info">
                                        <div className="bookshelf-session-title">{latestSession.bookTitle}</div>
                                        {(() => {
                                            const allShelfBooks = shelves.flatMap((s) => s.shelfBooks ?? []);
                                            const shelfBook = allShelfBooks.find((sb) => String(sb.book.id) === String(latestSession.bookId));
                                            const pct = shelfBook?.book.pages
                                                ? Math.round(((shelfBook.pagesRead ?? 0) / shelfBook.book.pages) * 100)
                                                : 0;
                                            return (
                                                <>
                                                    <div className="bookshelf-session-subtitle">
                                                        Page {shelfBook?.pagesRead ?? 0} of {shelfBook?.book.pages ?? "?"}
                                                    </div>
                                                    <div className="bookshelf-progress-bar">
                                                        <div className="bookshelf-progress-fill" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <div className="bookshelf-progress-label">{pct}% complete</div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <Button
                                        className="bookshelf-session-btn-resume"
                                        onClick={handleResume}
                                        loading={resumeLoading}
                                    >
                                        Resume Reading
                                    </Button>
                                </>
                            ) : (
                                <div className="bookshelf-session-empty">Loading...</div>
                            )}
                        </div>

                        {/* Shelf picker */}
                        <div className="shelf-picker">
                            <button className="shelf-picker-btn" onClick={() => setDropdownOpen((o) => !o)}>
                                {selectedShelf?.name ?? "Select shelf"}
                                <span style={{ fontSize: 10 }}>{dropdownOpen ? "▲" : "▼"}</span>
                            </button>

                            {dropdownOpen && (
                                <div className="shelf-picker-dropdown">
                                    {shelves.map((shelf) => (
                                        <div
                                            key={shelf.id}
                                            onClick={() => handleShelfSelect(shelf)}
                                            className={`shelf-picker-item ${shelf.id === selectedShelfId ? "active" : "inactive"}`}
                                        >
                                            <span>{shelf.name}</span>
                                            <span className="shelf-picker-item-count">{shelf.shelfBooks.length}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dynamic books from selected shelf */}
                        {(() => {
                            const rows: Book[][] = [];
                            const cappedBooks = displayBooks.slice(0, SHELF_MAX);
                            for (let i = 0; i < cappedBooks.length; i += BOOKS_PER_ROW) {
                                rows.push(cappedBooks.slice(i, i + BOOKS_PER_ROW));
                            }
                            if (rows.length === 0) rows.push([]);

                            return (
                                <div className="bookshelf-rows">
                                    {rows.map((rowBooks, rowIdx) => (
                                        <div key={rowIdx} className="bookshelf-shelf">
                                            {rowBooks.length === 0 ? (
                                                <div className="shelf-empty">No books on this shelf yet.</div>
                                            ) : (
                                                rowBooks.map((book) => (
                                                    <div
                                                        key={book.id}
                                                        title={book.name}
                                                        className="book-spine"
                                                        onClick={() => router.push(`/books/${book.id}`)}
                                                    >
                                                        {book.coverUrl ? (
                                                            <img
                                                                src={book.coverUrl}
                                                                alt={book.name}
                                                                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }}
                                                            />
                                                        ) : (
                                                            book.name.split(" ").slice(0, 2).join(" ")
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Dynamic count */}
                        <div className="bookshelf-count">{displayBooks.length} books</div>
                    </div>

                    {/* Recent Readings */}
                    <div className="recent-readings-card">
                        <div className="recent-readings-title">Recent Readings</div>
                        {(() => {
                            const recentBooks = (
                                shelves.find((s) => s.name === "Recent Readings")?.shelfBooks?.map((sb) => sb.book) ?? []
                            ).slice(0, RECENT_MAX);

                            const rows: Book[][] = [];
                            for (let i = 0; i < recentBooks.length; i += BOOKS_PER_ROW) {
                                rows.push(recentBooks.slice(i, i + BOOKS_PER_ROW));
                            }
                            if (rows.length === 0) rows.push([]); // always at least one plank

                            return (
                                <div className="bookshelf-rows">
                                    {rows.map((rowBooks, rowIdx) => (
                                        <div key={rowIdx} className="bookshelf-shelf">
                                            {rowBooks.length === 0 ? (
                                                <div className="shelf-empty">No recent readings yet.</div>
                                            ) : (
                                                rowBooks.map((book) => (
                                                    <div
                                                        key={book.id}
                                                        title={book.name}
                                                        className="book-spine"
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => router.push(`/books/${book.id}`)}
                                                    >
                                                        {book.coverUrl ? (
                                                            <img
                                                            src={book.coverUrl}
                                                            alt={book.name}
                                                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }}
                                                            />
                                                        ) : (
                                                            book.name.split(" ").slice(0, 2).join(" ")
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Bottom Row */}
                    <div className="dashboard-bottom-row">

                        {/* Friend Activity */}
                        <div className="bottom-card">
                            <div className="bottom-card-title">Friend Activity</div>
                            <div className="friend-list">
                                {FRIENDS.map((f, i) => (
                                    <div key={i} className="friend-row">
                                        <div className="friend-avatar" style={{ background: f.color }}>{f.name[0]}</div>
                                        <div style={{ flex: 1 }}>
                                            <strong>{f.name}</strong>
                                            <span className="friend-action"> {f.action} </span>
                                            <strong>{f.book}</strong>
                                        </div>
                                        <div className="friend-time">{f.time}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div className="bottom-card">
                            <div className="bottom-card-title">Leaderboard</div>
                            <div className="lb-list">
                                {LB.map((r, i) => (
                                    <div key={i} className="lb-row">
                                        <div className="lb-rank">{r.rank}</div>
                                        <div className="lb-avatar" style={{ background: r.color }}>{r.name[0]}</div>
                                        <div className="lb-name">{r.name}</div>
                                        <div className="lb-points">{r.points} points</div>
                                    </div>
                                ))}
                                <div className="lb-dots">···</div>
                                <div className="lb-row-self">
                                    <div className="lb-rank">8</div>
                                    <div className="lb-avatar" style={{ background: "#7a6e5e" }}>
                                        {user?.name?.[0]?.toUpperCase() ?? "U"}
                                    </div>
                                    <div className="lb-name" style={{ fontWeight: 700 }}>{user?.name ?? "User"}</div>
                                    <div className="lb-points">32 points</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;