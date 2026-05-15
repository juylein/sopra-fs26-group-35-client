import { Book } from "./book";
import { User } from "./user";

export interface SessionParticipantGetDTO {
    shelfBookId: number;
    pagesRead: number;
    user: User;
    book: Book;
}