"use client"; 

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import { RotatingLines } from "react-loader-spinner";
import { toast, ToastContainer } from "react-toastify";
import { Button, message } from "antd";
import useLocalStorage from "@/hooks/useLocalStorage";
import { DeleteOutlined } from "@ant-design/icons";
import TopBar from "@/components/topbar";
import "@/styles/library.css"


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

interface Shelf {
  id: number;
  name: string;
  books: Book[];
}


const Library: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();

  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  // const [libraryData, setLibraryData] = useState<unknown>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [shelfName, setShelfName] = useState<string>("");
  const [editingShelfId, setEditingShelfId] = useState<number | null>(null);
  const isDefaultShelf = (name: string) => ["To Read", "Recent Readings", "Read"].includes(name);

  // For renaming shelves
  const [renamingShelfId, setRenamingShelfId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");

  const { id } = useParams();
  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchShelves = async () => {
      setLoadingData(true);
      try {
        const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
        setShelves(data);
      } catch (error) {
        toast.error("Failed to load shelves");
      } finally {
        setLoadingData(false);
      }
    };

    if (userId) fetchShelves();
  }, [apiService, userId]);

  const handleCreateNewShelf = async () => {
    if (!shelfName.trim()) {
      messageApi.error("Shelf name is required");
      return;
    }

    try {
      await apiService.post(`/users/${userId}/library/shelves`, { name: shelfName }); 
      messageApi.success("Shelf created!");
      setModalIsOpen(false);
      setShelfName("");

      // Refresh shelves
      const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
      setShelves(data);

    } catch (error) {
      console.error(error);
      messageApi.error("Error creating shelf");
    }
  };

  const handleRenameShelf = async (shelfId: number) => {
    if (!renameValue.trim()) {
      messageApi.error("Shelf name cannot be empty");
      return;
    }
    try {
      await apiService.put(`/users/${userId}/library/shelves/${shelfId}`, { name: renameValue });
      setShelves((prev) =>
        prev.map((s) => (s.id === shelfId ? { ...s, name: renameValue } : s))
      );
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
      await apiService.delete(`/users/${userId}/library/shelves/${shelfId}`); // to be changed
      messageApi.success("Shelf deleted!");
      setShelves((prev) => prev.filter((s) => s.id !== shelfId));
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to delete shelf");
    }
  };

  const handleRemoveBook = async (shelfId: number, bookId: number) => {
  try {
    await apiService.delete(
      `/users/${userId}/library/shelves/${shelfId}/books/${bookId}`
    );

    // Update UI instantly
    setShelves((prev) =>
      prev.map((s) =>
        s.id === shelfId
          ? { ...s, books: s.books.filter((b) => b.id !== bookId) }
          : s
      )
    );

    messageApi.success("Book removed");
  } catch (error) {
    console.error(error);
    messageApi.error("Failed to remove book");
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
useEffect(() => {
  const fetchUser = async () => {
      if (!localStorage.getItem("token")) {
          router.push("/login");
          return;
      }
  };

  fetchUser();
}, [apiService, userId, router]);
  return (
    <div className="library-container">
      {contextHolder}
      <Sidebar />

      {/* Top Bar */}
      <TopBar onLogout={handleLogout} />

      {/* Main Content */}
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

            {/* User Shelves */}
            {shelves.map((shelf) => (
              <div key={shelf.id} className="section"
              style={{ position: "relative", paddingTop: 20 }} >
              {/* Section title — shows rename input when editing a non-default shelf */}
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
                <div className="section-title">{shelf.name}</div>
              )}

              {/* Edit button */}
              <button
                onClick={() => {
                  const entering = editingShelfId !== shelf.id;
                  setEditingShelfId(entering ? shelf.id : null);
                  if (entering && !isDefaultShelf(shelf.name)) {
                    setRenamingShelfId(shelf.id);
                    setRenameValue(shelf.name);
                  } else {
                    setRenamingShelfId(null);
                    setRenameValue("");
                  }
                }}
                className="edit-bookshelf-btn"
                style={{ position: "absolute", top: 10, right: 120 }}
              >
                {editingShelfId === shelf.id ? "Done" : "Edit"}
              </button>
                
                {/* Delete button grseyed out for default shelves */}  
                <button
                  onClick={() => {
                    if (!isDefaultShelf(shelf.name)) {
                      handleDeleteShelf(shelf.id);
                    }
                  }}
                  className="delete-bookshelf-btn"
                  title={
                    isDefaultShelf(shelf.name)
                      ? "Default shelves cannot be deleted"
                      : "Delete Bookshelf"
                  }
                  disabled={isDefaultShelf(shelf.name)}
                >
                  Delete Bookshelf
                </button>
                <div className="bookshelf-shelf">

                  {shelf.books.map((book) => (
                  <div
                    key={book.id}
                    style={{ position: "relative" }} // important for overlay button
                  >
                    <div
                      title={book.name}
                      className="book"
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/books/${book.id}`)}
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 3,
                          }}
                        />
                      ) : (
                        book.name.split(" ").slice(0, 2).join(" ")
                      )}
                    </div>

                    {/* DELETE BUTTON (only in edit mode) */}
                    {editingShelfId === shelf.id && (
                      <button
                        className="delete-book-btn"
                        onClick={(e) => {e.stopPropagation(); handleRemoveBook(shelf.id, book.id); }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                  {/* Add book button */}
                  <div
                    className="book add-book-btn"
                    onClick={() => router.push(`/discover?shelfId=${shelf.id}`)}
                  >
                    +
                  </div>
                </div>
                <div className="bookshelf-count">{shelf.books.length} books</div>
              </div>
            ))}

            {/* Create Shelf */}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                className="primary-btn"
                onClick={() => setModalIsOpen(true)}
              >
                + Create New Shelf
              </button>
            </div>

            {/* Data
            <div className="data-grid">
              {loadingData ? (
                <p>Loading data...</p>
              ) : (
                <pre>{JSON.stringify(shelves, null, 2)}</pre>
              )}
            </div> */}
          </div>
        </div>

        {(loadingPath || loadingData) && (
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

        <ToastContainer />
      </div>

      
      {modalIsOpen && (
        <div
          className="modal-overlay"
          onClick={() => setModalIsOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create new shelf</h2>

            <input
              className="modal-input"
              value={shelfName}
              onChange={(e) => setShelfName(e.target.value)}
              placeholder="Shelf name"
            />

            <div className="modal-actions">
              <button className="primary-btn" onClick={handleCreateNewShelf}>
                Save
              </button>
              <button
                className="primary-btn"
                onClick={() => setModalIsOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;