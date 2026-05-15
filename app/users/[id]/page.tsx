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
import {UserStats} from "@/types/leaderboard";
import {Activity} from "@/types/activity";
import { useHandleErrorMessage } from "@/hooks/useHandleErrorMessage";
import PieChart from "@/components/piechart";

const avatarColor = (name: string) => {
    const colors = ["#8b1a1a", "#3a5a8b", "#5a5a5a", "#2a7a4a", "#7a6e5e", "#6a3a8b"];
    let hash = 0;
    for (const c of name) hash += c.charCodeAt(0);
    return colors[hash % colors.length];
};

const GENRE_COLORS = [
  "#3a5a8b", "#8b1a1a", "#2a7a4a", "#c4903a",
  "#5a5a5a", "#7a3080", "#3a8b7a", "#8b6a1a",
];


const formatActivityTime = (raw: string | number[]): string => {
    // Jackson 3.x serialises LocalDateTime as [year,month,day,hour,min,sec,...] by default
    let date: Date;
    if (Array.isArray(raw)) {
        const [y, mo, d, h = 0, min = 0] = raw as number[];
        date = new Date(y, mo - 1, d, h, min);
    } else {
        date = new Date(raw);
    }
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

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
    const { handleErrorMessage } = useHandleErrorMessage();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Shelves state
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { value: savedShelfId, set: saveShelfId } = useLocalStorage<number | null>("dashboard_shelf_id", null);
    const [selectedShelfId, setSelectedShelfId] = useState<number | null>(savedShelfId);

    const [latestSession, setLatestSession] = useState<{
        id: number;
        bookTitle: string;
        coverUrl: string | null;
        shelfBookId: number;
        pagesRead: number | null;
    } | null>(null);
    const [latestSessionEmpty, setLatestSessionEmpty] = useState(false);
    const [resumeLoading, setResumeLoading] = useState(false);
    const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
    const [activities,setActivities] = useState<Activity[]>([]);
    // Compute selected shelf and books to display based on selectedShelfId
    const selectedShelf = shelves.find((s) => s.id === selectedShelfId) ?? null;
    const displayBooks = selectedShelf?.shelfBooks.map(sb => sb.book) ?? [];

    // Derive stats from the "Read" shelf
    const readShelf = shelves.find((s) => s.name === "Read") ?? null;
    const booksRead = readShelf?.shelfBooks.length ?? 0;
    const pagesRead = shelves
        .flatMap((s) => s.shelfBooks ?? [])
        .reduce((sum, sb) => sum + (sb.pagesRead ?? 0), 0);

        const currentUserStats = leaderboard.find(
            (u) => u.id=== Number(id)
        );

    // Leaderboard state
    const sortedLeaderboard = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
    const currentUserRank = sortedLeaderboard.findIndex((u) => u.id === Number(id)) + 1;
    const currentUserLeaderboardEntry = sortedLeaderboard.find((u) => u.id === Number(id));

    // Stats
    const [userStats, setUserStats] = useState<{
    totalPoints: number;
    booksRead: number;
    pagesRead: number;
    numFriends: number;
    readingPoints: number;
    quizPoints: number;
    } | null>(null);

    // Fetch shelves on component mount
    useEffect(() => {
        if (isLoggingOut) return;
        const fetchShelves = async () => {
            if (!id) return;

            try {
                const data = await apiService.get<Shelf[]>(`/users/${id}/library/shelves`);
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
        if (isLoggingOut) return;
        const fetchLatest = async () => {
            try {
                const data = await apiService.get<{ id: number; bookTitle: string; coverUrl: string | null; shelfBookId: number; pagesRead: number | null } | null>(
                    `/users/${userId}/sessions/latest`
                );
                if (data && data.id) {
                    setLatestSession(data);
                } else {
                    setLatestSessionEmpty(true);
                }
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
            const shelfBook = allShelfBooks.find((sb) => sb.id === latestSession.shelfBookId);

            if (!shelfBook) {
                alert("Could not find this book in your shelves.");
                return;
            }

            router.push(`/session?shelfBookId=${shelfBook.id}`);
        } catch {
            alert("Failed to start session.");
        } finally {
            setResumeLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggingOut) return;
        const getLeaderboard = async () => {
            try {
                const data = await apiService.get<UserStats[]>(`/users/leaderboard`);
                setLeaderboard(data);
            } catch (error) {
                handleErrorMessage(error);
            }
        };
    
        getLeaderboard();
    }, [apiService]);

    useEffect(() => {
        if (isLoggingOut) return;
        const fetchActivities = async () => {
            if (!userId) return;
    
            try {
                const data = await apiService.get<Activity[]>(`/users/${userId}/activities`);
                setActivities(data);
            } catch (error) {
                console.error("Failed to fetch activities", error);
            }
        };
    
        fetchActivities();
    }, [apiService, userId]);
    
    // Handler for shelf change
    const handleShelfSelect = (shelf: Shelf) => {
        setSelectedShelfId(shelf.id);
        saveShelfId(shelf.id);
        setDropdownOpen(false);
    };

    const handleLogout = async (): Promise<void> => {
        setIsLoggingOut(true);
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

    useEffect(() => {
        const fetchStats = async () => {
            if (!userId || !id) return;

            try {
                console.log(`Fetching stats for user ID ${id}...`);

                const data = await apiService.get<{
                    totalPoints: number;
                    booksRead: number;
                    pagesRead: number;
                    numFriends: number;
                    readingPoints: number;
                    quizPoints: number;
                }>(`/users/${id}/statistics`);

                console.log("Fetched user stats:", data);

                setUserStats(data);
            } catch (error) {
                console.error("Failed to fetch user stats:", error);
            }
        };

        fetchStats();
    }, [apiService, id, userId]);

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
                                [currentUserStats?.totalPoints, "points"],
                                [currentUserStats?.numFriends, "friends"],
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
                                            const shelfBook = allShelfBooks.find((sb) => sb.id === latestSession.shelfBookId);
                                            const pct = shelfBook?.book.pages
                                                ? Math.round(((shelfBook.pagesRead ?? 0) / shelfBook.book.pages) * 100)
                                                : 0;
                                            return (
                                                <>
                                                    <div className="bookshelf-session-subtitle">
                                                        Page {latestSession.pagesRead ?? 0} of {shelfBook?.book.pages ?? "?"}
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

                    {/* Reading Stats */}
                    <div className="stats-card">
                    <div className="stats-card-title">Reading Stats</div>
                    <div className="stats-body">

                        {/* Left: reading points + quiz points */}
                        <div className="stats-metrics">
                        <div className="stats-metric">
                            <div className="stats-metric-icon">📖</div>
                            <div className="stats-metric-value">{userStats?.readingPoints ?? "—"}</div>
                            <div className="stats-metric-label">Reading points</div>
                        </div>
                        <div className="stats-divider" />
                        <div className="stats-metric">
                            <div className="stats-metric-icon">🧠</div>
                            <div className="stats-metric-value">{userStats?.quizPoints ?? "—"}</div>
                            <div className="stats-metric-label">Quiz points</div>
                        </div>
                        </div>

                        <div className="stats-vertical-divider" />

                        {/* Middle: Genre breakdown pie */}
                        <div className="stats-chart-section">
                            <div className="stats-genre-title">Genres Read</div>

                            <PieChart
                                slices={
                                    Object.entries(
                                        (readShelf?.shelfBooks ?? []).reduce<Record<string, number>>((acc, sb) => {
                                            const g = sb.book.genre ?? "Unknown";
                                            acc[g] = (acc[g] ?? 0) + 1;
                                            return acc;
                                        }, {})
                                    )
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([label, value], i) => ({
                                        label,
                                        value,
                                        color: GENRE_COLORS[i % GENRE_COLORS.length],
                                    }))
                                }
                                emptyMessage="Start reading to see your genre breakdown!"
                            />
                        </div>

                        <div className="stats-vertical-divider" />

                        {/* Right: Points breakdown donut */}
                        <div className="stats-chart-section">
                            <div className="stats-genre-title">Points Breakdown</div>

                            <PieChart
                                slices={[
                                    { label: "Reading", value: userStats?.readingPoints ?? 0, color: "#3a5a8b" },
                                    { label: "Quiz", value: userStats?.quizPoints ?? 0, color: "#c4903a" },
                                ]}
                                showTotal
                                centerLabel="total"
                                emptyMessage="Earn points to see your breakdown!"
                            />
                        </div>

                    </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="dashboard-bottom-row">

                        {/* Friend Activity */}
                        <div className="bottom-card">
                            <div className="bottom-card-title">Friend Activity</div>
                            <div className="friend-list">
                                {activities.length === 0 ? (
                                    <div className="shelf-empty">No friend activity yet.</div>
                                ) : (
                                    activities.map((a) => (
                                        <div key={a.id} className="friend-row">
                                            <div className="friend-avatar" style={{ background: avatarColor(a.username) }}>{a.username[0].toUpperCase()}</div>
                                            <div style={{ flex: 1 }}>
                                                <strong>{a.username}</strong>
                                                <span className="friend-action"> {a.actions} </span>
                                                <strong>{a.book}</strong>
                                            </div>
                                            <div className="friend-time">{formatActivityTime(a.timestamp)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div className="bottom-card">
                            <div className="bottom-card-title">Leaderboard</div>

                            <div className="lb-list">
                                {sortedLeaderboard.length === 0 ? (
                                    <div className="shelf-empty">No leaderboard data yet.</div>
                                ) : (
                                    <>
                                        {sortedLeaderboard.slice(0, 5).map((r, i) => (
                                            <div key={r.id ?? i} className="lb-row">
                                                <div className="lb-rank">{i + 1}</div>

                                                <div
                                                    className="lb-avatar"
                                                    style={{ background: "#3a5a8b" }}
                                                >
                                                    {r.username[0].toUpperCase()}
                                                </div>

                                                <div className="lb-name">{r.username}</div>

                                                <div className="lb-points">
                                                    {r.totalPoints} points
                                                </div>
                                            </div>
                                        ))}

                                        {currentUserLeaderboardEntry &&
                                            currentUserRank > 0 && (
                                                <>
                                                <div className="lb-dots">···</div>

                                                <div className="lb-row-self">
                                                    <div className="lb-rank">
                                                        {currentUserRank}
                                                    </div>

                                                    <div
                                                        className="lb-avatar"
                                                        style={{ background: "#3a5a8b" }}
                                                    >
                                                        {user?.username?.toUpperCase()[0] ?? "U"}
                                                    </div>

                                                    <div
                                                        className="lb-name"
                                                        style={{ fontWeight: 700 }}
                                                    >
                                                        {currentUserLeaderboardEntry.username}
                                                    </div>

                                                    <div className="lb-points">
                                                        {currentUserLeaderboardEntry.totalPoints} points
                                                    </div>
                                                </div>
                                                </>
                                            )}
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;