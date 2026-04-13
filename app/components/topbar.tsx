"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Button } from "antd";
import "@/styles/topbar.css";
import { useState } from "react";

type Notification = {
    id: number;
    title: string;
    message: string;
    time: string;
    read: boolean;
};

const NOTIFICATIONS = [
    { id: 1, text: "You've read 2 books this month!", time: "2 min ago" },
    { id: 2, text: "Someone liked your review of 'Dune'", time: "Yesterday" },
];

type TopBarProps = {
    title?: string;
    onLogout?: () => void;
    onNotificationsClick?: () => void;
};

export default function TopBar({ title, onLogout, onNotificationsClick }: TopBarProps) {
    const [open, setOpen] = useState(false);

    return (
        <header className="topbar">
            {title && <span className="topbar-title">{title}</span>}

            <div className="topbar-actions">

                <div className="topbar-notif-wrapper">
                    <button className="topbar-icon-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
                        <Bell size={18} />
                    </button>
                    {open && (
                        <div className="topbar-notif-dropdown">
                            {NOTIFICATIONS.map((n) => (
                                <div key={n.id} className="topbar-notif-item">
                                    <p className="topbar-notif-text">{n.text}</p>
                                    <span className="topbar-notif-time">{n.time}</span>
                                </div>
                            ))}
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