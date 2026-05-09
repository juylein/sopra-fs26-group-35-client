import { ShelfBook } from "./shelfbook";

export enum NotificationEventType {
    SHARED_SESSION_START = "SHARED_SESSION_START",
    SHARED_SESSION_JOIN = "SHARED_SESSION_JOIN",
    SHARED_SESSION_QUIT = "SHARED_SESSION_QUIT",
    SHARED_SESSION_PAGE = "SHARED_SESSION_PAGE",
}

interface NotificationEventSharedSession {
    from: string;
    to: string;
    participants: string[];
    sessionId: string;
}

export interface NotificationEventSharedSessionJoinPayload
    extends NotificationEventSharedSession {
    shelfBook: ShelfBook;
}

export interface NotificationEventSharedSessionPagePayload
    extends NotificationEventSharedSession {
    numberOfPages: number;
}

export type NotificationEvent =
    | {
          type: NotificationEventType.SHARED_SESSION_START;
          payload: NotificationEventSharedSession;
      }
    | {
          type: NotificationEventType.SHARED_SESSION_JOIN;
          payload: NotificationEventSharedSessionJoinPayload;
      }
    | {
          type: NotificationEventType.SHARED_SESSION_QUIT;
          payload: NotificationEventSharedSession;
      }
    | {
          type: NotificationEventType.SHARED_SESSION_PAGE;
          payload: NotificationEventSharedSessionPagePayload;
      };