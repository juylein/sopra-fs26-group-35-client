export interface ApplicationError extends Error {
  info: string;
  status: number;
}

export interface ResponseStatusException {
  detail: string;
  instance: string;
  status: number;
  title: string;
}