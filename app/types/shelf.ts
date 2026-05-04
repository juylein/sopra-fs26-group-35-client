import { ShelfBook } from "./shelfbook";

export interface Shelf {
    id: number;
    name: string;
    shelfBooks: ShelfBook[];
}
  