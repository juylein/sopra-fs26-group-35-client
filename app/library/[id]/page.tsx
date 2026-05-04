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

const ShelfPage: React.FC = () => {
  const router = useRouter();
  const { shelfId } = useParams<{ shelfId: string }>();
  const apiService = useApi();
  const messageApi = useAppMessage();

  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingShelf, setEditingShelf] = useState(false);

  const shelf = shelves.find(
    (s) => String(s.id) === String(shelfId)
  );

  useEffect(() => {
    const fetchShelves = async () => {
      if (!localStorage.getItem("token")) {
        router.push("/login");
        return;
      }

      if (!userId) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        const data = await apiService.get<Shelf[]>(
          `/users/${userId}/library/shelves`
        );
        setShelves(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load shelves");
      } finally {
        setLoadingData(false);
      }
    };

    fetchShelves();
  }, [userId, apiService, router]);

  const handleRemoveBook = async (bookId: number) => {
    if (!shelf) return;

    try {
      await apiService.delete(
        `/users/${userId}/library/shelves/${shelfId}/books/${bookId}`
      );

      setShelves((prev) =>
        prev.map((s) =>
          String(s.id) === String(shelfId)
            ? {
                ...s,
                shelfBooks: s.shelfBooks.filter(
                  (b) => b.book.id !== bookId
                ),
              }
            : s
        )
      );

      messageApi.success("Book removed");
    } catch {
      messageApi.error("Failed to remove book");
    }
  };

  const handleLogout = async () => {
    try {
      if (!userId) {
        router.push("/login");
        return;
      }
      await apiService.put(`/users/${userId}/logout`, {});
    } catch (e) {
      console.error(e);
    } finally {
      clearToken();
      clearId();
      router.push("/login");
    }
  };

  // chunk books into rows
  const chunkBooks = (shelfBooks: Shelf["shelfBooks"]) => {
    const rows: Shelf["shelfBooks"][] = [];
    for (let i = 0; i < shelfBooks.length; i += BOOKS_PER_ROW) {
      rows.push(shelfBooks.slice(i, i + BOOKS_PER_ROW));
    }
    if (rows.length === 0) rows.push([]);
    return rows;
  };

  const rows = chunkBooks(shelf?.shelfBooks ?? []);

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
                {shelf?.name ?? "Bookshelf"}
              </div>

              <p style={{ fontSize: 16, color: "#555", margin: 0 }}>
                {!loadingData &&
                  `${shelf?.shelfBooks.length ?? 0} book${
                    shelf?.shelfBooks.length !== 1 ? "s" : ""
                  }`}
              </p>
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

            {/* Shelf */}
            {!loadingData && shelf && (
              <div className="section" style={{ position: "relative", paddingTop: 20 }}>
                <div className="section-title">{shelf.name}</div>

                {/* Edit toggle */}
                <button
                  className="edit-bookshelf-btn"
                  style={{ position: "absolute", top: 10, right: 25 }}
                  onClick={() => setEditingShelf((e) => !e)}
                >
                  {editingShelf ? "Done" : "Edit"}
                </button>

                <div className="bookshelf-rows">
                  {rows.map((rowBooks, rowIdx) => (
                    <div key={rowIdx} className="bookshelf-shelf">
                      {rowBooks.length === 0 ? (
                        <div className="shelf-empty">
                          No books on this shelf yet.
                        </div>
                      ) : (
                        <>
                          {rowBooks.map((shelfBook) => (
                            <div key={shelfBook.id} style={{ position: "relative" }}>
                              <div
                                title={shelfBook.book.name}
                                className="book"
                                style={{ background: "#3a5a8b", cursor: "pointer" }}
                                onClick={() =>
                                  router.push(`/books/${shelfBook.book.id}`)
                                }
                              >
                                {shelfBook.book.coverUrl ? (
                                  <img
                                    src={shelfBook.book.coverUrl}
                                    alt={shelfBook.book.name}
                                    className="book-cover-img"
                                  />
                                ) : (
                                  shelfBook.book.name
                                    .split(" ")
                                    .slice(0, 2)
                                    .join(" ")
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

                          {/* Add button */}
                          {rowIdx === rows.length - 1 && (
                            <div
                              className="book add-book-btn"
                              onClick={() =>
                                router.push(`/discover?shelfId=${shelfId}`)
                              }
                            >
                              +
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="shelf-footer">
                  <div className="bookshelf-count">
                    {shelf.shelfBooks.length} books
                  </div>
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