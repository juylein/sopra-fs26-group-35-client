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

interface Book {
  id: number;
  googleId: string | null;
  name: string;
  authors: string[];
  pages: number | null;
  releaseYear: number | null;
  genre: string | null;
  description: string | null;
  coverUrl: string | null;
}
interface Shelf {
  id: number;
  name: string;
  books: Book[];
}

const Dashboard: React.FC = () => {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const apiService = useApi();
    const [user, setUser] = useState<User | null>(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const [seconds, setSeconds] = useState(35 * 60 + 43);

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

    // Shelves state
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { value: savedShelfId, set: saveShelfId } = useLocalStorage<number | null>("dashboard_shelf_id", null);
    const [selectedShelfId, setSelectedShelfId] = useState<number | null>(savedShelfId);

    // Compute selected shelf and books to display based on selectedShelfId
    const selectedShelf = shelves.find((s) => s.id === selectedShelfId) ?? null;
    const displayBooks = selectedShelf?.books ?? [];

    // Derive stats from the "Read" shelf
    const readShelf = shelves.find((s) => s.name === "Read") ?? null;
    const booksRead = readShelf?.books.length ?? 0;
    const pagesRead = readShelf?.books.reduce((sum, book) => sum + (book.pages ?? 0), 0) ?? 0;

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
    }, [apiService, id, router]);

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

    return (
        <div className="dashboard-root">
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
                        <Button
                        className="profile-edit-btn"
                        onClick={() => router.push(`/users/${id}/edit`)}
                        >
                        Edit Profile
                        </Button>
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
                            <div className="bookshelf-session-cover" />
                            <div className="bookshelf-session-info">
                                <div className="bookshelf-session-title">Wuthering Heights – Emily Brontë</div>
                                <div className="bookshelf-session-subtitle">Session Paused · Page 244/359</div>
                                <div className="bookshelf-progress-bar">
                                    <div className="bookshelf-progress-fill" />
                                </div>
                                <div className="bookshelf-progress-label">68% complete</div>
                            </div>
                            <div className="bookshelf-timer">{formatTime(seconds)}</div>
                            <Button
                                className={timerRunning ? "bookshelf-session-btn-pause" : "bookshelf-session-btn-resume"}
                                onClick={() => setTimerRunning((r) => !r)}
                            >
                                {timerRunning ? "Pause Session" : "Resume Session"}
                            </Button>
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
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#e0d8cc")}
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                    shelf.id === selectedShelfId ? "#e0d8cc" : "#fff")
                                }
                                >
                                <span>{shelf.name}</span>
                                <span className="shelf-picker-item-count">{shelf.books.length}</span>
                                </div>
                            ))}
                            </div>
                        )}
                        </div>

                        {/* Dynamic books */}
                        <div className="bookshelf-shelf">
                        {displayBooks.length === 0 ? (
                            <div className="shelf-empty">No books on this shelf yet.</div>
                        ) : (
                            displayBooks.map((book) => (
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

                        {/* Dynamic count */}
                        <div className="bookshelf-count">{displayBooks.length} books</div>
                    </div>

                    {/* Recent Readings */}
                    <div className="recent-readings-card">
                        <div className="recent-readings-title">Recent Readings</div>
                            <div className="bookshelf-shelf">
                                {shelves.find((s) => s.name === "Recent Readings") ?.books.length === 0 ? (
                                    <div style={{ color: "#aaa", fontSize: 14, padding: "12px 0" }}>
                                        No recent readings yet.
                                    </div>
                                ) : (
                                    shelves.find((s) => s.name === "Recent Readings") ?.books.map((book) => (
                                        <div
                                        key={book.id}
                                        title={book.name}
                                        className="book-spine-sm"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => router.push(`/books/${book.id}`)}
                                    >
                                    {book.coverUrl ? (
                                        <img
                                        src={book.coverUrl}
                                        alt={book.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }}
                                        />
                                    ) : (book.name.split(" ").slice(0, 2).join(" "))}
                                    </div>
                                )))}
                        </div>
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