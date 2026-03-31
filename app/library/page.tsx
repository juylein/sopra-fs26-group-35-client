"use client"; 

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import { RotatingLines } from "react-loader-spinner";
import { toast, ToastContainer } from "react-toastify";
import { Button, message } from "antd";
import useLocalStorage from "@/hooks/useLocalStorage";


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


  const handleAddBookToShelf = async (book: Book, shelfId: number) => {
    try {
      await apiService.post(`/users/${userId}/library/shelves/${shelfId}/books`, book);
      messageApi.success(`Added "${book.name}" to shelf!`);

      // Refresh shelves
      const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
      setShelves(data);
    } catch (error) {
      console.error(error);
      messageApi.error("Failed to add book to shelf");
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
        if (!userId) { router.push("/login"); return; }
        await apiService.post(`/users/${userId}/logout`, {});
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        clearToken();
        clearId();
        router.push("/login");
    }
};
  // const BOOKS = [
  //   { title: "War and Peace", color: "#8b4a20" },
  //   { title: "Pride and Prejudice", color: "#3a5a8b" },
  //   { title: "Alice in Wonderland", color: "#2a6a3a" },
  //   { title: "Roald Dahl", color: "#c8a84b" },
  //   { title: "Frankenstein", color: "#5a5a5a" },
  //   { title: "Dune", color: "#7a5a20" },
  //   { title: "Name of the Wind", color: "#3a6a5a" },
  //   { title: "The Great Gatsby", color: "#3a5a8b" },
  //   { title: "Twilight", color: "#2a2a2a" },
  //   { title: "Crime and Punishment", color: "#8b1a1a" },
  //   { title: "Harry Potter", color: "#2a3a7a" },
  //   { title: "The Hobbit", color: "#4a6a2a" },
  // ];

  const BOOKS: Book[] = [
    { id: 1, googleId: null, name: "War and Peace", authors: ["Tolstoy"], pages: null, releaseYear: null, genre: null, description: null, coverUrl: null },
    { id: 2, googleId: null, name: "Pride and Prejudice", authors: ["Austen"], pages: null, releaseYear: null, genre: null, description: null, coverUrl: null },
    { id: 3, googleId: null, name: "Alice in Wonderland", authors: ["Carroll"], pages: null, releaseYear: null, genre: null, description: null, coverUrl: null },
  ];

  const toReadShelf = shelves.find(s => s.name === "To Read");
  const otherShelves = shelves.filter(s => s.name !== "To Read");

  return (
    <div className="library-container">
      <Sidebar />

      {/* Top Bar */}
      <div className="topbar">
        <input className="search-input" placeholder="Search books..." />

        <Button onClick={handleLogout} className="logout-btn">
          Logout
        </Button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Header */}
            <div className="section">
              <div className="library-title">Library</div>
            </div>

            {/* Sections
            {["Recent Readings", "To Read Pile", "My Shelf #1"].map((section, idx) => (
              <div key={idx} className="section">
                <div className="section-title">{section}</div>
                <div className="book-row">
                  {BOOKS.map((b, i) => (
                    <div
                      key={i}
                      title={b.title}
                      className="book"
                      style={{ background: b.color }}
                    >
                      {b.title.split(" ").slice(0, 2).join(" ")}
                    </div>
                  ))}
                </div>
              </div>
            ))} */}

            {/* User Shelves */}
            {shelves.map((shelf) => (
              <div key={shelf.id} className="section">
                <div className="section-title">{shelf.name}</div>
                <div className="book-row">
                  {shelf.books.map((book) => (
                    <div
                      key={book.id}
                      title={book.name}
                      className="book"
                      style={{ background: "#3a5a8b", cursor: "pointer" }}
                      onClick={() => router.push(`/books/${book.id}`)}
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }}
                        />
                      ) : (
                        book.name.split(" ").slice(0, 2).join(" ")
                      )}
                    </div>
                  ))}

                  {/* Add book button */}
                  <div
                      className="book"
                      style={{
                        background: "#e8e0cc",
                        border: "2px dashed #c8b898",
                        color: "#8a7d6a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        cursor: "pointer"
                      }}
                      onClick={() => router.push(`/discover?shelfId=${shelf.id}`)}
                    >
                      +
                  </div>
                </div>
              </div>
            ))}

            {/* Create Shelf */}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                className="primary-btn"
                onClick={() => setModalIsOpen(true)}
              >
                Create New Shelf
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