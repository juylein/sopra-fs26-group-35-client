import { stompClient } from "@/utils/websocket";
import { useCallback, useEffect, useState } from "react";
import { NotificationEvent } from "@/types/notificationEvent";
import { StompSubscription } from "@stomp/stompjs";

export interface UseNotificationsResult {
    notificationQueue: NotificationEvent[];
    popNotification: () => NotificationEvent | undefined;
    setNotificationUserId: (userId: string) => void;
}

export const useNotifications = (): UseNotificationsResult => {
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [notificationQueue, setNotificationQueue] = useState<NotificationEvent[]>([]);

    const popNotification = useCallback(() => {
        if (notificationQueue.length === 0) {
            return undefined;
        }
        const last = notificationQueue.at(-1);
        setNotificationQueue(notificationQueue.slice(0, -1));
        return last;
    }, [notificationQueue]);

    useEffect(() => {
        if (userId == null) return;

        let subscription: StompSubscription;

        const subscribe = () => {
            console.warn(`connected ${userId}`);
            subscription = stompClient.subscribe(
                `/topic/notifications/${userId}`,
                (message) => {
                    const event = JSON.parse(message.body) as NotificationEvent;
                    console.warn(`received event for ${userId}: ${JSON.stringify(event)}`);
                    setNotificationQueue(prev => [...prev, event]);
                }
            );
        };

        if (stompClient.connected) {
            // already connected, subscribe immediately
            subscribe();
        } else {
            // not yet connected, subscribe once connection is established
            stompClient.onConnect = subscribe;
            stompClient.activate();
        }

        return () => {
            console.warn(`disconnecting ${userId}`);
            subscription?.unsubscribe();
        };

    }, [userId]);

    return {
        notificationQueue,
        popNotification,
        setNotificationUserId: setUserId,
    };
};