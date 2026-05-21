"use client"; 

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import { RotatingLines } from "react-loader-spinner";
import { toast, ToastContainer } from "react-toastify";
import useLocalStorage from "@/hooks/useLocalStorage";
import TopBar from "@/components/topbar";
import "@/styles/library.css"
import { useAppMessage } from "@/hooks/useAppMessage";
import { Shelf } from "@/types/shelf";
import { User } from "@/types/user";

const BOOKS_PER_ROW = 18;
const MAX_ROWS = 1;
const MAX_BOOKS_DISPLAYED = BOOKS_PER_ROW * MAX_ROWS;
const EDIT_PAGE_SIZE = 5;

const Library: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const messageApi = useAppMessage();

  const [loadingPath] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [shelfName, setShelfName] = useState<string>("");
  const [editingShelfId, setEditingShelfId] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Edit list pagination per shelf: shelfId -> page number
  const [editPages, setEditPages] = useState<Record<number, number>>({});

  const [renamingShelfId, setRenamingShelfId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");

  const isDefaultShelf = (name: string) =>
    ["To Read", "Recent Readings", "Read"].includes(name);

  // For sharing shelves
  const [friends, setFriends] = useState<User[]>([]);
  const [shareModalShelfId, setShareModalShelfId] = useState<number | null>(null);
  const [shareSearchValue, setShareSearchValue] = useState<string>("");

  // For viewing members
  const [membersModalShelf, setMembersModalShelf] = useState<Shelf | null>(null);

  // For confirming shared shelf deletion
  const [deleteConfirmShelf, setDeleteConfirmShelf] = useState<Shelf | null>(null);

  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

  // ── Data fetching ─────────────────────────────────────

  const loadAllShelves = async () => {
    setLoadingData(true);
    try {
      const [privateShelves, sharedShelves] = await Promise.all([
        apiService.get<Shelf[]>(`/users/${userId}/library/shelves`),
        apiService.get<Shelf[]>(`/users/${userId}/library/shared-shelves`),
      ]);
      setShelves([...privateShelves, ...sharedShelves]);
    } catch {
      toast.error("Failed to load shelves");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadAllShelves();

    const fetchFriends = async () => {
      try {
        const user = await apiService.get<User>(`/users/${userId}`);
        setFriends(user.friends ?? []);
      } catch {
        // non-critical
      }
    };
    fetchFriends();
  }, [apiService, userId]);

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

  // ── Handlers ──────────────────────────────────────────

  const handleCreateNewShelf = async () => {
    if (!shelfName.trim()) { messageApi.error("Shelf name is required"); return; }
    try {
      await apiService.post(`/users/${userId}/library/shelves`, { name: shelfName });
      messageApi.success("Shelf created!");
      setModalIsOpen(false);
      setShelfName("");
      await loadAllShelves();
    } catch (error) {
      console.error(error);
      messageApi.error("Error creating shelf");
    }
  };

  const handleRenameShelf = async (shelfId: number) => {
    if (!renameValue.trim()) { messageApi.error("Shelf name cannot be empty"); return; }
    try {
      await apiService.put(`/users/${userId}/library/shelves/${shelfId}`, { name: renameValue });
      setShelves((prev) => prev.map((s) => (s.id === shelfId ? { ...s, name: renameValue } : s)));
      messageApi.success("Shelf renamed!");
      setRenamingShelfId(null);
      setRenameValue("");
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to rename shelf");
    }
  };

  const handleDeleteShelf = async (shelfId: number) => {
    try {
      await apiService.delete(`/users/${userId}/library/shelves/${shelfId}`);
      messageApi.success("Shelf deleted!");
      setShelves((prev) => prev.filter((s) => s.id !== shelfId));
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to delete shelf");
    }
  };

  const handleLeaveSharedShelf = async (shelfId: number) => {
    try {
      await apiService.delete(`/users/${userId}/library/shared-shelves/${shelfId}`);
      messageApi.success("Left shared shelf");
      setShelves((prev) => prev.filter((s) => s.id !== shelfId));
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to leave shelf");
    }
  };

  const handleRemoveBook = async (shelfId: number, bookId: number) => {
    try {
      await apiService.delete(`/users/${userId}/library/shelves/${shelfId}/books/${bookId}`);
      setShelves((prev) =>
        prev.map((s) =>
          s.id === shelfId
            ? { ...s, shelfBooks: s.shelfBooks.filter((b) => b.book.id !== bookId) }
            : s
        )
      );
      messageApi.success("Book removed");
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to remove book");
    }
  };

  const openShareModal = (shelfId: number) => {
    setShareModalShelfId(shelfId);
    setShareSearchValue("");
  };

  const closeShareModal = () => {
    setShareModalShelfId(null);
    setShareSearchValue("");
  };

  const handleInviteToShelf = async (friendId: number, friendUsername: string) => {
    if (!shareModalShelfId) return;
    try {
      await apiService.post(
        `/users/${userId}/library/shelves/${shareModalShelfId}/members`,
        { targetUserId: friendId }
      );
      messageApi.success(`Invitation sent to ${friendUsername}!`);
      closeShareModal();
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to send invitation");
    }
  };

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

  // ── Helpers ───────────────────────────────────────────

  if (!isAuthorized) return <ToastContainer position="top-center" />;

  const chunkBooks = (shelfBooks: Shelf["shelfBooks"]) => {
    const displayed = shelfBooks.slice(0, MAX_BOOKS_DISPLAYED);
    const rows: Shelf["shelfBooks"][] = [];
    for (let i = 0; i < displayed.length; i += BOOKS_PER_ROW) {
      rows.push(displayed.slice(i, i + BOOKS_PER_ROW));
    }
    if (rows.length === 0) rows.push([]);
    return rows;
  };

  const getEditPage = (shelfId: number) => editPages[shelfId] ?? 0;
  const setEditPage = (shelfId: number, page: number) =>
    setEditPages((prev) => ({ ...prev, [shelfId]: page }));

  // ── Render ────────────────────────────────────────────

  return (
    <div className="library-container">
      <Sidebar />
      <TopBar onLogout={handleLogout} />

      <div className="main-content">
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Header */}
            <div style={{ padding: 0, border: "none", background: "transparent" }}>
              <div className="library-title">Library</div>
              <p className="library-description" style={{ fontSize: 16, color: "#555" }}>
                Your personal collection of books. Browse, add, or manage your shelves and discover new reads.
              </p>
            </div>

            {/* Shelves */}
            {shelves.map((shelf) => {
              const rows = chunkBooks(shelf.shelfBooks);
              const hasMore = shelf.shelfBooks.length > MAX_BOOKS_DISPLAYED;
              const isDefault = isDefaultShelf(shelf.name);
              const isEditing = editingShelfId === shelf.id;

              // Edit list pagination
              const editPage = getEditPage(shelf.id);
              const editTotalPages = Math.max(1, Math.ceil(shelf.shelfBooks.length / EDIT_PAGE_SIZE));
              const pagedEditBooks = shelf.shelfBooks.slice(
                editPage * EDIT_PAGE_SIZE,
                (editPage + 1) * EDIT_PAGE_SIZE
              );

              return (
                <div
                  key={shelf.id}
                  className={`section ${isDefault ? "section-default" : "section-custom"}`}
                  style={{ position: "relative", paddingTop: 20 }}
                >
                  {/* Default shelf badge */}
                  {isDefault && <span className="shelf-default-badge">Default</span>}

                  {/* Title or rename input */}
                  {renamingShelfId === shelf.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <input
                        className="modal-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRenameShelf(shelf.id)}
                        autoFocus
                        style={{ maxWidth: 260 }}
                      />
                      <button className="primary-btn" onClick={() => handleRenameShelf(shelf.id)}>Save</button>
                      <button className="primary-btn" onClick={() => { setRenamingShelfId(null); setRenameValue(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {shelf.name}
                    </div>
                  )}

                  {/* Action buttons — top right */}
                  <div className="shelf-action-btns">
                    {!isDefault && (
                      <button
                        className="share-bookshelf-btn"
                        onClick={() => openShareModal(shelf.id)}
                      >
                        Share
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const entering = editingShelfId !== shelf.id;
                        setEditingShelfId(entering ? shelf.id : null);
                        setEditPage(shelf.id, 0);
                        if (entering && !isDefault) {
                          setRenamingShelfId(shelf.id);
                          setRenameValue(shelf.name);
                        } else {
                          setRenamingShelfId(null);
                          setRenameValue("");
                        }
                      }}
                      className="edit-bookshelf-btn"
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                    {/* Delete only for custom shelves */}
                    {!isDefault && (
                      <button
                        onClick={() =>
                          shelf.shared
                            ? setDeleteConfirmShelf(shelf)
                            : handleDeleteShelf(shelf.id)
                        }
                        className="delete-bookshelf-btn"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Edit mode: paginated list view with title + author */}
                  {isEditing ? (
                    <div className="shelf-edit-list">
                      {shelf.shelfBooks.length === 0 ? (
                        <div className="shelf-edit-empty">No books on this shelf yet.</div>
                      ) : (
                        pagedEditBooks.map((shelfBook) => (
                          <div key={shelfBook.id} className="shelf-edit-row">
                            <div className="shelf-edit-cover">
                              {shelfBook.book.coverUrl ? (
                                <img
                                  src={shelfBook.book.coverUrl}
                                  alt={shelfBook.book.name}
                                  className="shelf-edit-cover-img"
                                />
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
                              <button
                                className="shelf-edit-view-btn"
                                onClick={() => router.push(`/books/${shelfBook.book.id}`)}
                              >
                                View
                              </button>
                              <button
                                className="shelf-edit-remove-btn"
                                onClick={() => handleRemoveBook(shelf.id, shelfBook.book.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Edit list footer: pagination + add */}
                      <div className="shelf-edit-footer">
                        {editTotalPages > 1 && (
                          <div className="shelf-pagination">
                            <button
                              className="pagination-btn"
                              onClick={() => setEditPage(shelf.id, Math.max(0, editPage - 1))}
                              disabled={editPage === 0}
                            >
                              ← Prev
                            </button>
                            {Array.from({ length: editTotalPages }, (_, i) => (
                              <button
                                key={i}
                                className={`pagination-dot ${i === editPage ? "active" : ""}`}
                                onClick={() => setEditPage(shelf.id, i)}
                              >
                                {i + 1}
                              </button>
                            ))}
                            <button
                              className="pagination-btn"
                              onClick={() => setEditPage(shelf.id, Math.min(editTotalPages - 1, editPage + 1))}
                              disabled={editPage === editTotalPages - 1}
                            >
                              Next →
                            </button>
                          </div>
                        )}
                        <button
                          className="shelf-edit-add-btn"
                          onClick={() => router.push(`/discover?shelfId=${shelf.id}`)}
                        >
                          + Add a book
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal plank view */
                    <div className="bookshelf-rows">
                      {rows.map((rowBooks, rowIdx) => (
                        <div key={rowIdx} className="bookshelf-shelf">
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
                                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }}
                                  />
                                ) : (
                                  shelfBook.book.name.split(" ").slice(0, 2).join(" ")
                                )}
                              </div>
                            </div>
                          ))}
                          {rowIdx === rows.length - 1 && (
                            <div
                              className="book add-book-btn"
                              onClick={() => router.push(`/discover?shelfId=${shelf.id}`)}
                            >
                              +
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer — normal mode only */}
                  {!isEditing && (
                    <div className="shelf-footer">
                      <div className="bookshelf-count">
                        {shelf.shelfBooks.length} books{hasMore && ` · showing ${MAX_BOOKS_DISPLAYED}`}
                      </div>
                      <button
                        className="view-shelf-btn"
                        onClick={() => setMembersModalShelf(shelf)}
                      >
                        👥 {shelf.shared ? (shelf.memberUsernames?.length ?? 0) : 1} member{(!shelf.shared || (shelf.memberUsernames?.length ?? 0) <= 1) ? "" : "s"}
                      </button>
                      <button
                        className="view-shelf-btn"
                        onClick={() => router.push(`/library/${shelf.id}`)}
                      >
                        View Bookshelf →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Create Shelf */}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button className="primary-btn" onClick={() => setModalIsOpen(true)}>
                + Create New Shelf
              </button>
            </div>
          </div>
        </div>

        {(loadingPath || loadingData) && (
          <div className="loader-center">
            <RotatingLines strokeColor="black" strokeWidth="10" animationDuration="0.6" width="50" visible={true} />
          </div>
        )}
        <ToastContainer />
      </div>

      {/* Create shelf modal */}
      {modalIsOpen && (
        <div className="modal-overlay" onClick={() => setModalIsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create new shelf</h2>
            <input
              className="modal-input"
              value={shelfName}
              onChange={(e) => setShelfName(e.target.value)}
              placeholder="Shelf name"
            />
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleCreateNewShelf}>Save</button>
              <button className="primary-btn" onClick={() => setModalIsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Members modal */}
      {membersModalShelf !== null && (
        <div className="modal-overlay" onClick={() => setMembersModalShelf(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{membersModalShelf.name} — Members</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(membersModalShelf.memberUsernames ?? []).length === 0 ? (
                <div style={{ color: "#777", fontSize: 14 }}>No members yet.</div>
              ) : (
                (membersModalShelf.memberUsernames ?? []).map((username, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", background: "#f5f5f5", borderRadius: 8,
                  }}>
                    <div style={{
                      background: membersModalShelf.shared ? "#3a5a8b" : "#2e7d32",
                      borderRadius: "50%", width: 34, height: 34,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 600, color: "#fff", flexShrink: 0, fontSize: 13,
                    }}>
                      {username.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{username}</div>
                    {!membersModalShelf.shared && (
                      <div style={{ fontSize: 12, color: "#777", marginLeft: 4 }}>Owner</div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="primary-btn" onClick={() => setMembersModalShelf(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete shared shelf modal */}
      {deleteConfirmShelf !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmShelf(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {(deleteConfirmShelf.memberUsernames?.length ?? 0) <= 1 ? (
              <>
                <h2>Delete shared shelf?</h2>
                <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
                  You are the last member. Deleting will permanently remove <strong>{deleteConfirmShelf.name}</strong>.
                </p>
              </>
            ) : (
              <>
                <h2>Leave shared shelf?</h2>
                <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
                  This will remove <strong>{deleteConfirmShelf.name}</strong> from your library. Other members will not be affected.
                </p>
              </>
            )}
            <div className="modal-actions">
              <button
                className="delete-bookshelf-btn"
                style={{ position: "static" }}
                onClick={async () => {
                  const id = deleteConfirmShelf.id;
                  setDeleteConfirmShelf(null);
                  await handleLeaveSharedShelf(id);
                }}
              >
                {(deleteConfirmShelf.memberUsernames?.length ?? 0) <= 1 ? "Delete shelf" : "Leave shelf"}
              </button>
              <button className="primary-btn" onClick={() => setDeleteConfirmShelf(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Share shelf modal */}
      {shareModalShelfId !== null && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Invite a friend to this shelf</h2>
            <input
              className="modal-input"
              value={shareSearchValue}
              onChange={(e) => setShareSearchValue(e.target.value)}
              placeholder="Filter by username"
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {friends.length === 0 ? (
                <div style={{ color: "#777", fontSize: 14 }}>You have no friends to invite yet.</div>
              ) : friends.filter((f) =>
                  !shareSearchValue.trim() ||
                  f.username?.toLowerCase().includes(shareSearchValue.trim().toLowerCase())
                ).length === 0 ? (
                <div style={{ color: "#777", fontSize: 14 }}>No friends match your search.</div>
              ) : (
                friends
                  .filter((f) =>
                    !shareSearchValue.trim() ||
                    f.username?.toLowerCase().includes(shareSearchValue.trim().toLowerCase())
                  )
                  .map((friend) => (
                    <div key={friend.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 10px", background: "#f5f5f5", borderRadius: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          background: "#f4c400", borderRadius: "50%",
                          width: 34, height: 34, display: "flex", alignItems: "center",
                          justifyContent: "center", fontWeight: 600, flexShrink: 0, fontSize: 13,
                        }}>
                          {friend.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{friend.username}</div>
                          {friend.name && <div style={{ fontSize: 12, color: "#555" }}>{friend.name}</div>}
                        </div>
                      </div>
                      <button
                        className="primary-btn"
                        onClick={() => handleInviteToShelf(friend.id, friend.username ?? "")}
                      >
                        Invite
                      </button>
                    </div>
                  ))
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="primary-btn" onClick={closeShareModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;