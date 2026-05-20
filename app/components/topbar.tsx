"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, UserPlus, HelpCircle, Activity, BookOpen, X } from "lucide-react";
import { Button } from "antd";
import "@/styles/topbar.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import { useRouter } from "next/navigation";

type NotificationType = "FRIEND_REQUEST" | "QUIZ_CHALLENGE" | "FRIEND_ACTIVITY" | "SHARED_SESSION" | "SHELF_INVITATION";

type Notification = {
    id: number;
    type: NotificationType;
    message: string;
    read: boolean;
    createdAt: string;
};

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
    FRIEND_REQUEST:   <UserPlus size={15} />,
    QUIZ_CHALLENGE:   <HelpCircle size={15} />,
    FRIEND_ACTIVITY:  <Activity size={15} />,
    SHARED_SESSION:   <Activity size={15} />,
    SHELF_INVITATION: <BookOpen size={15} />,
};

const TYPE_LABEL: Record<NotificationType, string> = {
    FRIEND_REQUEST:   "Friend Request",
    QUIZ_CHALLENGE:   "Quiz Challenge",
    FRIEND_ACTIVITY:  "Friend Activity",
    SHARED_SESSION:   "Shared Session",
    SHELF_INVITATION: "Shelf Invitation",
};

const getRedirectPath = (type: NotificationType): string | null => {
    switch (type) {
        case "FRIEND_REQUEST":
        case "SHELF_INVITATION":
            return `/friends`;
        case "QUIZ_CHALLENGE":
            return `/quiz`;
        case "SHARED_SESSION":
            return `/shared`;
        case "FRIEND_ACTIVITY":
        default:
            return null;
    }
};

type TopBarProps = {
    title?: string;
    onLogout?: () => void;
};

export default function TopBar({ title, onLogout }: TopBarProps) {
    const { value: storedId } = useLocalStorage<string>("id", "");
    const userId = storedId ? Number(storedId) : null;
    const apiService = useApi();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const data = await apiService.get<{ unreadCount: number }>(
                `/users/${userId}/notifications/unread-count`
            );
            setUnreadCount(data.unreadCount ?? 0);
        } catch {}
    }, [userId, apiService]);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await apiService.get<Notification[]>(
                `/users/${userId}/notifications`
            );
            const sorted = [...data].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setNotifications(sorted);
        } catch {}
    }, [userId, apiService]);

    const markAllRead = useCallback(async () => {
        if (!userId) return;
        try {
            await apiService.put(`/users/${userId}/notifications/read`, {});
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {}
    }, [userId, apiService]);

    const handleDiscard = async (e: React.MouseEvent, notificationId: number) => {
        e.stopPropagation();
        if (!userId) return;
        try {
            await apiService.delete(`/users/${userId}/notifications/${notificationId}`);
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        } catch {}
    };

    const handleNotificationClick = (n: Notification) => {
        const path = getRedirectPath(n.type);
        if (path) {
            setOpen(false);
            router.push(path);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30_000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const handleBellClick = async () => {
        const opening = !open;
        setOpen(opening);
        if (opening) {
            await fetchNotifications();
            await markAllRead();
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="topbar">
            {title && <span className="topbar-title">{title}</span>}

            <div className="topbar-actions">
                <div className="topbar-notif-wrapper" ref={dropdownRef}>
                    <button
                        className="topbar-icon-btn"
                        onClick={handleBellClick}
                        aria-label="Notifications"
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="topbar-notif-badge">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </button>

                    {open && (
                        <div className="topbar-notif-dropdown">
                            <div className="topbar-notif-header">Notifications</div>

                            {notifications.length === 0 ? (
                                <div className="topbar-notif-empty">
                                    <p>You&apos;re all caught up!</p>
                                </div>
                            ) : (
                                notifications.map((n) => {
                                    const path = getRedirectPath(n.type);
                                    return (
                                        <div
                                            key={n.id}
                                            className={`topbar-notif-item ${n.read ? "read" : "unread"} ${path ? "clickable" : ""}`}
                                            onClick={() => handleNotificationClick(n)}
                                        >
                                            <div className="topbar-notif-item-header">
                                                <span className="topbar-notif-type-label">
                                                    {TYPE_ICON[n.type]}
                                                    <span>{TYPE_LABEL[n.type]}</span>
                                                </span>
                                                <button
                                                    className="topbar-notif-discard"
                                                    onClick={(e) => handleDiscard(e, n.id)}
                                                    aria-label="Dismiss notification"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <p className="topbar-notif-text">{n.message}</p>
                                            <span className="topbar-notif-time">
                                                {new Date(n.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
                <Button className="topbar-logout-btn" onClick={onLogout}>
                    Logout
                </Button>
            </div>
        </header>
    );
}