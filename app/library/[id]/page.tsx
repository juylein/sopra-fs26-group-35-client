"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { RotatingLines } from "react-loader-spinner";
import { toast, ToastContainer } from "react-toastify";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useAppMessage } from "@/hooks/useAppMessage";
import { Shelf } from "@/types/shelf";
import "@/styles/library.css";

const BOOKS_PER_ROW = 18;
const ROWS_PER_PAGE = 4;
const BOOKS_PER_PAGE = BOOKS_PER_ROW * ROWS_PER_PAGE;

const ShelfPage: React.FC = () => {
  const router = useRouter();
  const { id: shelfId } = useParams<{ id: string }>();
  const apiService = useApi();
  const messageApi = useAppMessage();

  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [shelfName, setShelfName] = useState<string>("Bookshelf");
  const [loadingData, setLoadingData] = useState(true);
  const [editingShelf, setEditingShelf] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }

    if (!userId) {
      setLoadingData(false);
      return;
    }

    const fetchShelf = async () => {
      setLoadingData(true);
      try {
        const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
        const found = data.find((s) => s.id === Number(shelfId));
        console.log(shelfId);
        console.log(data);
        if (found) {
          setShelf(found);
          setShelfName(found.name);
        } else {
          setShelfName("Bookshelf");
          setShelf({ id: Number(shelfId), name: "Bookshelf", shelfBooks: [] } as Shelf);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load shelf");
      } finally {
        setLoadingData(false);
      }
    };

    fetchShelf();
  }, [userId, shelfId, apiService, router]);

  const handleRemoveBook = async (bookId: number) => {
    if (!shelf) return;
    try {
      await apiService.delete(`/users/${userId}/library/shelves/${shelfId}/books/${bookId}`);
      setShelf((prev) =>
        prev
          ? { ...prev, shelfBooks: prev.shelfBooks.filter((b) => b.book.id !== bookId) }
          : prev
      );
      messageApi.success("Book removed");
    } catch {
      messageApi.error("Failed to remove book");
    }
  };

  const handleLogout = async () => {
    try {
      if (!userId) { router.push("/login"); return; }
      await apiService.put(`/users/${userId}/logout`, {});
    } catch (e) {
      console.error(e);
    } finally {
      clearToken();
      clearId();
      router.push("/login");
    }
  };

  // Pagination
  const allBooks = shelf?.shelfBooks ?? [];
  const totalPages = Math.max(1, Math.ceil(allBooks.length / BOOKS_PER_PAGE));
  const pagedBooks = allBooks.slice(
    currentPage * BOOKS_PER_PAGE,
    (currentPage + 1) * BOOKS_PER_PAGE
  );

  // Chunk current page's books into rows of BOOKS_PER_ROW
  const rows: Shelf["shelfBooks"][] = [];
  for (let i = 0; i < pagedBooks.length; i += BOOKS_PER_ROW) {
    rows.push(pagedBooks.slice(i, i + BOOKS_PER_ROW));
  }
  // Always show at least one row (empty plank)
  if (rows.length === 0) rows.push([]);

  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="library-container">
      <Sidebar />
      <TopBar onLogout={handleLogout} />

      <div className="main-content">
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Header */}
            <div style={{ padding: 0, border: "none", background: "transparent" }}>
              <button className="back-btn" onClick={() => router.back()}>
                ← Back to Library
              </button>
              <div className="library-title" style={{ marginTop: 12 }}>
                {shelfName}
              </div>
              {!loadingData && (
                <p style={{ fontSize: 16, color: "#555", margin: 0 }}>
                  {allBooks.length} book{allBooks.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Loading */}
            {loadingData && (
              <div className="loader-center">
                <RotatingLines
                  strokeColor="black"
                  strokeWidth="10"
                  animationDuration="0.6"
                  width="50"
                  visible={true}
                />
              </div>
            )}

            {/* Shelf — always shown once loading is done */}
            {!loadingData && (
              <div className="section" style={{ position: "relative", paddingTop: 20 }}>
                <div className="section-title">{shelfName}</div>

                <button
                  className="edit-bookshelf-btn"
                  style={{ position: "absolute", top: 10, right: 25 }}
                  onClick={() => setEditingShelf((e) => !e)}
                >
                  {editingShelf ? "Done" : "Edit"}
                </button>

                {/* Rows */}
                <div className="bookshelf-rows">
                  {rows.map((rowBooks, rowIdx) => (
                    <div key={rowIdx} className="bookshelf-shelf">
                      {rowBooks.length === 0 ? (
                        <div className="shelf-empty">No books on this shelf yet.</div>
                      ) : (
                        <>
                          {rowBooks.map((shelfBook) => (
                            <div key={shelfBook.id} style={{ position: "relative" }}>
                              <div
                                title={shelfBook.book.name}
                                className="book"
                                style={{ background: "#3a5a8b", cursor: "pointer" }}
                                onClick={() => router.push(`/books/${shelfBook.book.id}`)}
                              >
                                {shelfBook.book.coverUrl ? (
                                  <img
                                    src={shelfBook.book.coverUrl}
                                    alt={shelfBook.book.name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      borderRadius: 3,
                                    }}
                                  />
                                ) : (
                                  shelfBook.book.name.split(" ").slice(0, 2).join(" ")
                                )}
                              </div>
                              {editingShelf && (
                                <button
                                  className="delete-book-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveBook(shelfBook.book.id);
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}

                          {/* + button on last row of last page only */}
                          {rowIdx === rows.length - 1 && isLastPage && (
                            <div
                              className="book add-book-btn"
                              onClick={() => router.push(`/discover?shelfId=${shelfId}`)}
                            >
                              +
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer: count + pagination */}
                <div className="shelf-footer">
                  <div className="bookshelf-count">
                    {allBooks.length} books
                    {totalPages > 1 && ` · page ${currentPage + 1} of ${totalPages}`}
                  </div>

                  {totalPages > 1 && (
                    <div className="shelf-pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                      >
                        ← Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          className={`pagination-dot ${i === currentPage ? "active" : ""}`}
                          onClick={() => setCurrentPage(i)}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
        <ToastContainer />
      </div>
    </div>
  );
};

export default ShelfPage;
