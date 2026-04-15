"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, UserPlus, HelpCircle, Activity } from "lucide-react";
import { Button } from "antd";
import "@/styles/topbar.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";

type NotificationType = "FRIEND_REQUEST" | "QUIZ_CHALLENGE" | "FRIEND_ACTIVITY";

type Notification = {
    id: number;
    type: NotificationType;
    message: string;
    referenceId: number | null;
    read: boolean;
    createdAt: string;
};

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
    FRIEND_REQUEST: <UserPlus size={15} />,
    QUIZ_CHALLENGE: <HelpCircle size={15} />,
    FRIEND_ACTIVITY: <Activity size={15} />,
};

const TYPE_LABEL: Record<NotificationType, string> = {
    FRIEND_REQUEST: "Friend Request",
    QUIZ_CHALLENGE: "Quiz Challenge",
    FRIEND_ACTIVITY: "Friend Activity",
};

type TopBarProps = {
    title?: string;
    onLogout?: () => void;
};

export default function TopBar({ title, onLogout }: TopBarProps) {
    const { value: storedId } = useLocalStorage<string>("id", "");
    const userId = storedId ? Number(storedId) : null;
    const apiService = useApi();

    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await apiService.get<{ unreadCount: number }>(
                `/users/${userId}/notifications/unread-count`
            );
            setUnreadCount(data.unreadCount ?? 0);
        } catch {
        }
    }, [userId, apiService]);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await apiService.get<Notification[]>(
                `/users/${userId}/notifications`
            );
            setNotifications(data);
        } catch {
        }
    }, [userId, apiService]);

    const markAllRead = useCallback(async () => {
        if (!userId) return;
        try {
            await apiService.put(`/users/${userId}/notifications/read`, {});
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
        }
    }, [userId, apiService]);

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

    const grouped = notifications.reduce<Record<NotificationType, Notification[]>>(
        (acc, n) => {
            acc[n.type] = acc[n.type] ?? [];
            acc[n.type].push(n);
            return acc;
        },
        {} as Record<NotificationType, Notification[]>
    );

    const groupOrder: NotificationType[] = ["FRIEND_REQUEST", "QUIZ_CHALLENGE", "FRIEND_ACTIVITY"];

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
                                groupOrder.map((type) =>
                                    grouped[type]?.length > 0 ? (
                                        <div key={type} className="topbar-notif-group">
                                            <div className="topbar-notif-group-label">
                                                {TYPE_ICON[type]}
                                                <span>{TYPE_LABEL[type]}</span>
                                            </div>
                                            {grouped[type].map((n) => (
                                                <div
                                                    key={n.id}
                                                    className={`topbar-notif-item ${n.read ? "read" : "unread"}`}
                                                >
                                                    <p className="topbar-notif-text">{n.message}</p>
                                                    <span className="topbar-notif-time">
                                                        {new Date(n.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null
                                )
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