import { User } from "./user";

export interface Leaderboard {
    id: number;
    user: User;
    readingPoints: number;
    quizPoints: number;
    totalPoints: number;

}