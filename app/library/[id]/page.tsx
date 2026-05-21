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
const EDIT_PAGE_SIZE = 10;

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

  // Plank view pagination
  const [currentPage, setCurrentPage] = useState(0);

  // Edit list pagination
  const [editPage, setEditPage] = useState(0);

  const isDefaultShelf = (name: string) =>
    ["To Read", "Recent Readings", "Read"].includes(name);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    if (!userId) { setLoadingData(false); return; }

    const fetchShelf = async () => {
      setLoadingData(true);
      try {
        const [privateShelves, sharedShelves] = await Promise.all([
          apiService.get<Shelf[]>(`/users/${userId}/library/shelves`),
          apiService.get<Shelf[]>(`/users/${userId}/library/shared-shelves`),
        ]);
        const found = [...privateShelves, ...sharedShelves].find((s) => s.id === Number(shelfId));
        if (found) {
          setShelf(found);
          setShelfName(found.name);
        } else {
          setShelfName("Bookshelf");
          setShelf({ id: Number(shelfId), name: "Bookshelf", shared: false, ownerId: null, memberIds: null, memberUsernames: [], shelfBooks: [] });
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
        prev ? { ...prev, shelfBooks: prev.shelfBooks.filter((b) => b.book.id !== bookId) } : prev
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
    } catch (e) { console.error(e); }
    finally { clearToken(); clearId(); router.push("/login"); }
  };

  const allBooks = shelf?.shelfBooks ?? [];
  const isDefault = isDefaultShelf(shelfName);

  // Plank view pagination
  const totalPages = Math.max(1, Math.ceil(allBooks.length / BOOKS_PER_PAGE));
  const pagedBooks = allBooks.slice(currentPage * BOOKS_PER_PAGE, (currentPage + 1) * BOOKS_PER_PAGE);
  const rows: Shelf["shelfBooks"][] = [];
  for (let i = 0; i < pagedBooks.length; i += BOOKS_PER_ROW) {
    rows.push(pagedBooks.slice(i, i + BOOKS_PER_ROW));
  }
  if (rows.length === 0) rows.push([]);
  const isLastPage = currentPage === totalPages - 1;

  // Edit list pagination
  const editTotalPages = Math.max(1, Math.ceil(allBooks.length / EDIT_PAGE_SIZE));
  const pagedEditBooks = allBooks.slice(editPage * EDIT_PAGE_SIZE, (editPage + 1) * EDIT_PAGE_SIZE);

  return (
    <div className="library-container">
      <Sidebar />
      <TopBar onLogout={handleLogout} />

      <div className="main-content">
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Header */}
            <div style={{ padding: 0, border: "none", background: "transparent" }}>
              <button className="back-btn" onClick={() => router.push("/library")}>
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
                <RotatingLines strokeColor="black" strokeWidth="10" animationDuration="0.6" width="50" visible={true} />
              </div>
            )}

            {/* Shelf */}
            {!loadingData && (
              <div
                className={`section ${isDefault ? "section-default" : "section-custom"}`}
                style={{ position: "relative", paddingTop: 20 }}
              >
                {isDefault && <span className="shelf-default-badge">Default</span>}
                <div className="section-title">{shelfName}</div>

                {/* Action buttons */}
                <div className="shelf-action-btns">
                  <button
                    className="edit-bookshelf-btn"
                    onClick={() => {
                      setEditingShelf((e) => !e);
                      setEditPage(0); // reset on toggle
                    }}
                  >
                    {editingShelf ? "Done" : "Edit"}
                  </button>
                </div>

                {/* Edit mode: paginated list */}
                {editingShelf ? (
                  <div className="shelf-edit-list">
                    {allBooks.length === 0 ? (
                      <div className="shelf-edit-empty">No books on this shelf yet.</div>
                    ) : (
                      pagedEditBooks.map((shelfBook) => (
                        <div key={shelfBook.id} className="shelf-edit-row">
                          <div className="shelf-edit-cover">
                            {shelfBook.book.coverUrl ? (
                              <img src={shelfBook.book.coverUrl} alt={shelfBook.book.name} className="shelf-edit-cover-img" />
                            ) : (
                              <div className="shelf-edit-cover-placeholder">
                                {shelfBook.book.name.split(" ").slice(0, 2).join(" ")}
                              </div>
                            )}
                          </div>
                          <div className="shelf-edit-info">
                            <div className="shelf-edit-title">{shelfBook.book.name}</div>
                            <div className="shelf-edit-author">
                              {shelfBook.book.authors?.join(", ") ?? "Unknown author"}
                            </div>
                          </div>
                          <div className="shelf-edit-actions">
                            <button className="shelf-edit-view-btn" onClick={() => router.push(`/books/${shelfBook.book.id}`)}>
                              View
                            </button>
                            <button className="shelf-edit-remove-btn" onClick={() => handleRemoveBook(shelfBook.book.id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Edit footer: pagination + add */}
                    <div className="shelf-edit-footer">
                      {editTotalPages > 1 && (
                        <div className="shelf-pagination">
                          <button
                            className="pagination-btn"
                            onClick={() => setEditPage((p) => Math.max(0, p - 1))}
                            disabled={editPage === 0}
                          >
                            ← Prev
                          </button>
                          {Array.from({ length: editTotalPages }, (_, i) => (
                            <button
                              key={i}
                              className={`pagination-dot ${i === editPage ? "active" : ""}`}
                              onClick={() => setEditPage(i)}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            className="pagination-btn"
                            onClick={() => setEditPage((p) => Math.min(editTotalPages - 1, p + 1))}
                            disabled={editPage === editTotalPages - 1}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                      <button
                        className="shelf-edit-add-btn"
                        onClick={() => router.push(`/discover?shelfId=${shelfId}`)}
                      >
                        + Add a book
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal plank view */
                  <>
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
                                      <img src={shelfBook.book.coverUrl} alt={shelfBook.book.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }} />
                                    ) : (
                                      shelfBook.book.name.split(" ").slice(0, 2).join(" ")
                                    )}
                                  </div>
                                </div>
                              ))}
                              {rowIdx === rows.length - 1 && isLastPage && (
                                <div className="book add-book-btn" onClick={() => router.push(`/discover?shelfId=${shelfId}`)}>+</div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Plank footer */}
                    <div className="shelf-footer">
                      <div className="bookshelf-count">
                        {allBooks.length} books
                        {totalPages > 1 && ` · page ${currentPage + 1} of ${totalPages}`}
                      </div>
                      {totalPages > 1 && (
                        <div className="shelf-pagination">
                          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>← Prev</button>
                          {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} className={`pagination-dot ${i === currentPage ? "active" : ""}`} onClick={() => setCurrentPage(i)}>{i + 1}</button>
                          ))}
                          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1}>Next →</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
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