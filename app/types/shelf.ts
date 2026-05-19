import { ShelfBook } from "./shelfbook";

export interface Shelf {
    id: number;
    name: string;
    shared: boolean;
    ownerId: number | null;
    memberIds: number[] | null;
    memberUsernames: string[];
    shelfBooks: ShelfBook[];
}
