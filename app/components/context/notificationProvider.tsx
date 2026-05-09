"use client"

import React, { createContext, PropsWithChildren, useContext } from "react";
import { useNotifications, UseNotificationsResult } from "@/hooks/useNotifications";

export const NotificationContext = createContext<UseNotificationsResult | null>(null);

export const NotificationProvider = ({ children }: PropsWithChildren) => {
    const result = useNotifications();

    return (
        <NotificationContext.Provider value={{ ...result }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotificationContext = () => {
    const context = useContext<UseNotificationsResult | null>(NotificationContext);

    if (!context) {
        throw new Error("useNotificationContext must be used within a NotificationProvider");
    }

    return context;
};