import Book from "@/books/page";
import { User } from "./user";

export interface SessionParticipantGetDTO {
    shelfBookId: number;
    pagesRead: number;
    user: User;
    book: Book;
}