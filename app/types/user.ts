export interface User {
  id: number;
  name: string | null;
  username: string | null;
  token: string | null;
  status: string | null;
  bio: string | null;
  creationDate: string | null;
  genres: string[] | null;
  friends: User[] | null;
  online: boolean | null;
}