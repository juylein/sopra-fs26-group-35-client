"use client";

import React, { useEffect, useState } from "react";
import TopBar from "@/components/topbar";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import Sidebar from "@/components/sidebar";
import { Button } from "antd";

interface Book {
  id: number;
  googleId: string | null;
  name: string;
  authors: string[];
  pages: number | null;
  releaseYear: number | null;
  genre: string | null;
  description: string | null;
  coverUrl: string | null;
}

const Book: React.FC = () => {
  const { id } = useParams();
  const apiService = useApi();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

  const handleLogout = async (): Promise<void> => {
    try {
        if (!userId) { router.push("/login"); return; }
        await apiService.put(`/users/${userId}/logout`, {});
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        clearToken();
        clearId();
        router.push("/login");
    }
};


  useEffect(() => {
    if (!id) return;

    const fetchBook = async () => {
      try {
        const data = await apiService.get<Book>(`/books/${id}`);
        setBook(data);
      } catch (error) {
        console.error("Failed to fetch book:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id, apiService]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading book...</div>;
  }

  if (!book) {
    return <div style={{ padding: 20 }}>Book not found</div>;
  }

  return (
    <div className="library-container">
      <Sidebar />
      <TopBar onLogout={handleLogout} />
  
      <div className="main-content">
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
          
          <div style={{ display: "flex", gap: 20 }}>
            
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.name}
                style={{
                  width: 160,
                  height: 240,
                  objectFit: "cover",
                  borderRadius: 8,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 160,
                  height: 240,
                  background: "#ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
              >
                No Cover
              </div>
            )}
  
            <div>
              <h1 style={{ marginBottom: 10 }}>{book.name}</h1>
  
              <p style={{ color: "#666" }}>
                {book.authors?.join(", ")}
              </p>
  
              <p><b>Pages:</b> {book.pages ?? "Unknown"}</p>
              <p><b>Year:</b> {book.releaseYear ?? "Unknown"}</p>
              <p><b>Genre:</b> {book.genre ?? "Unknown"}</p>
            </div>
          </div>
  
          <div style={{ marginTop: 30 }}>
            <h3>Description</h3>
            <p style={{ lineHeight: 1.6 }}>
              {book.description ?? "No description available."}
            </p>
  
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <Button className="discover-read-btn">Start Reading</Button>
              <Button className="discover-read-btn">Add review</Button>
            </div>
          </div>
  
        </div>
      </div>
    </div>
  );
};

export default Book;