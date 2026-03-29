import { ApiService } from "@/api/apiService";
import { useMemo } from "react"; // think of usememo like a singleton, it ensures only one instance exists

export const useApi = () => {
  const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const parsedToken = token ? JSON.parse(token) : null;
  return useMemo(() => new ApiService(parsedToken), [parsedToken]);
};
