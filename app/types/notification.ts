export type NotificationType = "FRIEND_REQUEST" | "QUIZ_CHALLENGE" | "FRIEND_ACTIVITY";

export interface NotificationGetDTO {
    id: number;
    type: NotificationType;
    message: string;
    referenceId: number | null;
    read: boolean;
    createdAt: string;
}