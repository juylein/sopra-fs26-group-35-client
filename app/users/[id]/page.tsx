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

const Dashboard: React.FC = () => {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const apiService = useApi();
    const [user, setUser] = useState<User | null>(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const [seconds, setSeconds] = useState(35 * 60 + 43);

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

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
                            <span
                            style={{ color: "#c4903a", cursor: "pointer", textDecoration: "underline" }}
                            onClick={() => router.push(`/users/${id}/edit`)}
                            >
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
                            <span
                            style={{ color: "#c4903a", cursor: "pointer", textDecoration: "underline" }}
                            onClick={() => router.push(`/users/${id}/edit`)}
                            >
                            add them
                            </span>
                        </span>
                        )}
                    </div>
                    </div>

                    {/* Row 4: stat cells */}
                    <div className="profile-stats">
                        {[
                        ["34", "books read"],
                        ["12,983", "pages read"],
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
                        <div className="bookshelf-title">{user?.name ?? "User"}&apos;s Bookshelf</div>

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

                        <div className="bookshelf-sort">
                            Sort by: <span className="bookshelf-sort-active">Most recently read</span>
                        </div>

                        <div className="bookshelf-shelf">
                            {BOOKS.map((b, i) => (
                                <div key={i} title={b.title} className="book-spine" style={{ background: b.color }}>
                                    {b.title.split(" ").slice(0, 2).join(" ")}
                                </div>
                            ))}
                        </div>
                        <div className="bookshelf-count">47 books</div>
                    </div>

                    {/* Recent Readings */}
                    <div className="recent-readings-card">
                        <div className="recent-readings-title">Recent Readings</div>
                        <div className="bookshelf-shelf">
                            {BOOKS.map((b, i) => (
                                <div key={i} title={b.title} className="book-spine-sm" style={{ background: b.color }}>
                                    {b.title.split(" ").slice(0, 2).join(" ")}
                                </div>
                            ))}
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