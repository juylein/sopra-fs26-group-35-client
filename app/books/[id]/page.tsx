"use client";

import AddReviewModal from "@/components/addReviewModal";
import React, { useEffect, useState } from "react";
import TopBar from "@/components/topbar";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import Sidebar from "@/components/sidebar";
import { Button } from "antd";
import { toast, ToastContainer } from "react-toastify";
import { Review } from "@/types/review";
import { ShelfBook } from "@/types/shelfbook";
import "@/styles/library.css";

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
  reviews: Review[] | null;
}

const Book: React.FC = () => {
  const { id } = useParams();
  const apiService = useApi();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bookShelves, setBookShelves] = useState<{ id: number; name: string }[]>([]);
  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

  const myReview = book?.reviews?.find((r) => r.userId === Number(userId)) ?? null;
  const otherReviews = book?.reviews?.filter((r) => r.userId !== Number(userId)) ?? [];

  const [isAuthorized, setIsAuthorized] = useState(false);

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

  const startReading = (): void => {
    router.push(`/session/`);
  };

  const handleReviewSubmission = async (rating: number, review: string) => {
    try {
      await apiService.post(`/books/${id}/reviews`, { rating, review });
      toast.success("Review added!");
    } catch (error) {
      toast.error("Failed to add review.");
    }
    try {
      const data = await apiService.get<Book>(`/books/${id}`);
      setBook(data);
    } catch (error) {
      console.error("Failed to fetch book:", error);
    }
  };

  const handleDeleteReview = async () => {
    try {
      await apiService.delete(`/users/${userId}/reviews/${myReview?.id}`);
      toast.success("Review deleted!");
      const data = await apiService.get<Book>(`/books/${id}`);
      setBook(data);
    } catch (error) {
      toast.error("Failed to delete review.");
    }
  };

  const handleEditReview = async (rating: number, review: string) => {
    try {
      await apiService.put(`/users/${userId}/reviews/${myReview?.id}`, { rating, review });
      setBook((prev) => prev ? {
        ...prev,
        reviews: (prev.reviews ?? []).map((r) =>
          r.id === myReview?.id ? { ...r, rating, review } : r
        )
      } : null);
      toast.success("Review updated!");
    } catch (error) {
      toast.error("Failed to update review.");
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      toast.error("You need to be logged in to access this page.", {
        autoClose: 2000,
        onClose: () => router.push("/login"),
      });
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

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

  // Fetch shelves that contain this book
  useEffect(() => {
    if (!userId || !id) return;
    
    // The id from URL is already the Google ID (string)
    const googleBookId = typeof id === 'string' ? id : String(id);
    
    console.log("Looking for Google Book ID:", googleBookId);
    
    const fetchBookShelves = async () => {
      try {
        // Fetch all user's shelves
        const shelves = await apiService.get<any[]>(`/users/${userId}/library/shelves`);
        
        // Filter shelves that contain this book
        const containingShelves = shelves.filter((shelf) => {
          if (shelf.shelfBooks && Array.isArray(shelf.shelfBooks)) {
            return shelf.shelfBooks.some((shelfBook: any) => {
              // Compare the Google ID (string) directly
              const matches = shelfBook.book?.id === googleBookId;
              if (matches) {
                console.log(`Found book in shelf: ${shelf.name}`);
              }
              return matches;
            });
          }
          return false;
        });
        
        console.log("Containing shelves:", containingShelves.map(s => ({ id: s.id, name: s.name })));
        
        setBookShelves(containingShelves.map((shelf) => ({ 
          id: shelf.id, 
          name: shelf.name 
        })));
      } catch (error) {
        console.error("Failed to fetch book shelves:", error);
      }
    };
    
    fetchBookShelves();
  }, [userId, id, apiService]);

  if (!isAuthorized) {
    return <ToastContainer position="top-center" />;
  }

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
              
              {/* Shelves this book is in */}
              <div style={{ marginTop: 12 }}>
                <b>In your shelves: </b>
                {bookShelves.length === 0 ? (
                  <span style={{ color: "#aaa" }}>Not on any shelf yet</span>
                ) : (
                  <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", marginLeft: 4 }}>
                    {bookShelves.map((s) => (
                      <span
                        key={s.id}
                        onClick={() => router.push(`/library/${s.id}`)}
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          background: "#e8eef8",
                          color: "#3a5a8b",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "1px solid #c8d4e8",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#d4e0f5")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#e8eef8")}
                      >
                        {s.name}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 30 }}>
            <h3>Description</h3>
            <p style={{ lineHeight: 1.6 }}>
              {book.description ?? "No description available."}
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <Button className="discover-read-btn" onClick={startReading}>Start Reading</Button>
              <Button className="discover-read-btn" onClick={() => setReviewModalOpen(true)} disabled={!!myReview}>
                {myReview ? "Already reviewed" : "Add review"}
              </Button>
            </div>

            <AddReviewModal
              open={reviewModalOpen}
              onClose={() => setReviewModalOpen(false)}
              onSubmit={handleReviewSubmission}
            />

            <AddReviewModal
              open={editModalOpen}
              onClose={() => setEditModalOpen(false)}
              onSubmit={handleEditReview}
              initialRating={myReview?.rating}
              initialReview={myReview?.review}
            />

            <div className="bottom-card" style={{ marginTop: 30 }}>
              <div className="bottom-card-title">Reviews</div>

              {myReview && (
                <div key={myReview.id} style={{
                  border: "1px solid #e0d8cc",
                  borderRadius: "8px",
                  padding: "12px",
                  background: "#f9f9f9",
                  marginBottom: "12px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ margin: 0 }}>
                      <b>{myReview.username}</b>{" "}
                      <span style={{ color: "#3a6b2a" }}>(you)</span>{" "}
                      <span style={{ color: "#fadb14" }}>{"★".repeat(myReview.rating)}</span>{"☆".repeat(5 - myReview.rating)}
                    </p>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button className="edit-bookshelf-btn" onClick={() => setEditModalOpen(true)}>Edit</button>
                      <button className="delete-bookshelf-btn" style={{ position: "static" }} onClick={handleDeleteReview}>Delete Review</button>
                    </div>
                  </div>
                  <p>{myReview.review}</p>
                  <div className="friend-time">
                    {new Date(myReview.timestamp).toLocaleString()}
                  </div>
                </div>
              )}

              {otherReviews
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((r) => (
                  <div key={r.id} style={{
                    borderBottom: "1px solid #eee",
                    padding: "12px 0"
                  }}>
                    <p><b>{r.username}</b> <span style={{ color: "#fadb14" }}>{"★".repeat(r.rating)}</span>{"☆".repeat(5 - r.rating)}</p>
                    <p>{r.review}</p>
                    <div className="friend-time">
                      {new Date(r.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}

              {/* No reviews yet — only when neither exists */}
              {!myReview && otherReviews.length === 0 && (
                <div className="shelf-empty">No reviews yet, be the first!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Book;