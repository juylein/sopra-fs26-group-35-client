"use client"

import React, { createContext, PropsWithChildren, useContext } from "react";
import { useNotifications, UseNotificationsResult } from "@/hooks/useNotifications";

type INotificationContext = UseNotificationsResult;

export const NotificationContext = createContext<INotificationContext | null>(null);

interface NotificationProviderProps extends PropsWithChildren {}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
    const result = useNotifications();

    return (
        <NotificationContext.Provider value={{ ...result }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotificationContext = () => {
    const context = useContext<INotificationContext | null>(NotificationContext);

    if (!context) {
        throw new Error("useNotificationContext must be used within a NotificationProvider");
    }

    return context;
};