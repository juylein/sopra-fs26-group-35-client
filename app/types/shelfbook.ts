import { Book } from "./book";

export interface ShelfBook {
    id: number;
    book: Book;
    pagesRead: number;
}