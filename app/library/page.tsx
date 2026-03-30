"use client"; 

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import { RotatingLines } from "react-loader-spinner";
import { toast, ToastContainer } from "react-toastify";
import { Button, message } from "antd";
import useLocalStorage from "@/hooks/useLocalStorage";


const Library: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();

  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [libraryData, setLibraryData] = useState<unknown>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [shelfName, setShelfName] = useState<string>("");

  const { id } = useParams();
  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const data = await apiService.get(`/dashboard?userId=${id}`); // change this part to a correct call later
        setLibraryData(data);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoadingData(false);
      }
    };

    if (id) fetchData();
  }, [apiService, id]);

  const handleCreateNewShelf = async () => {
    if (!shelfName.trim()) {
      messageApi.error("Shelf name is required");
      return;
    }

    try {
      await apiService.post("/shelves", { name: shelfName }); //also this one to a correct call 
      messageApi.success("Shelf created!");
      setModalIsOpen(false);
      setShelfName("");
    } catch (error) {
      console.error(error);
      messageApi.error("Error creating shelf");
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
  const BOOKS = [
    { title: "War and Peace", color: "#8b4a20" },
    { title: "Pride and Prejudice", color: "#3a5a8b" },
    { title: "Alice in Wonderland", color: "#2a6a3a" },
    { title: "Roald Dahl", color: "#c8a84b" },
    { title: "Frankenstein", color: "#5a5a5a" },
    { title: "Dune", color: "#7a5a20" },
    { title: "Name of the Wind", color: "#3a6a5a" },
    { title: "The Great Gatsby", color: "#3a5a8b" },
    { title: "Twilight", color: "#2a2a2a" },
    { title: "Crime and Punishment", color: "#8b1a1a" },
    { title: "Harry Potter", color: "#2a3a7a" },
    { title: "The Hobbit", color: "#4a6a2a" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Top Bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 220,
          right: 0,
          height: 60,
          background: "#faf7f2",
          borderBottom: "1px solid #e0d8cc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          zIndex: 1000,
        }}
      >
        <input
          type="text"
          placeholder="Search books..."
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid #e0d8cc",
            fontFamily: "inherit",
            fontSize: 14,
            flex: 1,
            maxWidth: 400,
          }}
        />

        <Button
          onClick={handleLogout}
          style={{
            background: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontFamily: "inherit",
            fontSize: 13,
            cursor: "pointer",
            height: 40,
            width: 90,
            marginLeft: 16,
          }}
        >
          Logout
        </Button>
      </div>

      {/* Main Dashboard */}
      <div
        style={{
          marginLeft: 220,
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          paddingTop: 64,
        }}
      >
        {/* MAIN CONTENT */}
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            paddingTop: 84,
            padding: "0 24px",
            width: "100%",
            fontFamily: "'Philosopher', serif",
          }}
        >
          <div style={{ fontFamily: "'Philosopher', serif", background: "#f5f0e8", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Library Header */}
            <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
              <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 14 }}>Library</div>
            </div>

            {/* Recent Readings */}
            <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Recent Readings</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                {BOOKS.map((b, i) => (
                  <div key={i} title={b.title} style={{ width: 54, height: 78, borderRadius: 3, background: b.color, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", fontSize: 7, color: "#fff", textAlign: "center", padding: "0 2px 3px" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "none")}
                  >
                    {b.title.split(" ").slice(0, 2).join(" ")}
                  </div>
                ))}
              </div>
            </div>

            {/* To Read Pile */}
            <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>To Read Pile</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                {BOOKS.map((b, i) => (
                  <div key={i} title={b.title} style={{ width: 54, height: 78, borderRadius: 3, background: b.color, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", fontSize: 7, color: "#fff", textAlign: "center", padding: "0 2px 3px" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "none")}
                  >
                    {b.title.split(" ").slice(0, 2).join(" ")}
                  </div>
                ))}
              </div>
            </div>

            {/* My Shelf #1 */}
            <div style={{ background: "#faf7f2", border: "1px solid #e0d8cc", borderRadius: 12, padding: "22px 24px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>My Shelf #1</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                {BOOKS.map((b, i) => (
                  <div key={i} title={b.title} style={{ width: 54, height: 78, borderRadius: 3, background: b.color, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", fontSize: 7, color: "#fff", textAlign: "center", padding: "0 2px 3px" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "none")}
                  >
                    {b.title.split(" ").slice(0, 2).join(" ")}
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Shelf Button */}
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button
                onClick={() => setModalIsOpen(true)}
                style={{
                  background: "#3a3080",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#2a2060")}
                onMouseLeave={e => (e.currentTarget.style.background = "#3a3080")}
              >
                Create New Shelf
              </button>
            </div>

            {/* Fetched library data */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {loadingData ? <p>Loading data...</p> : <pre>{JSON.stringify(libraryData, null, 2)}</pre>}
            </div>
          </div>
        </div>

        {(loadingPath || loadingData) && (
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 999 }}>
            <RotatingLines strokeColor="black" strokeWidth="10" animationDuration="0.6" width="50" visible={true} />
          </div>
        )}

        <ToastContainer toastClassName="custom-toast" />
      </div>

      {/* Modal */}
      {modalIsOpen && (
        <div style={overlayStyle} onClick={() => setModalIsOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2>Create new shelf</h2>
            <input
              value={shelfName}
              onChange={(e) => setShelfName(e.target.value)}
              placeholder="Shelf name"
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "12px",
                borderRadius: 8,
                border: "1px solid #e0d8cc",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button  className="library-manual-btn" onClick={handleCreateNewShelf}>Save</button>
              <button  className="library-manual-btn" onClick={() => setModalIsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;

// Styles for modal overlay
const overlayStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#faf7f2",
  padding: "20px",
  borderRadius: "12px",
  width: "300px",
  border: "1px solid #e0d8cc",
};