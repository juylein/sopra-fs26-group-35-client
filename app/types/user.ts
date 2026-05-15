export interface User {
  id: number;
  name: string | null;
  username: string | null;
  token: string | null;
  status: "ONLINE" | "OFFLINE";
  bio: string | null;
  creationDate: string | null;
  genres: string[] | null;
  friends: User[] | null;
}