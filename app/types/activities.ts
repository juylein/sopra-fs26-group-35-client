import { Book } from "./book";
import { User } from "./user";
export interface Activities {
    id:number;
    user:User;
    actions:string;
    LocalDateTime:string;

}