"use client";

import { ShelfBook } from "@/types/shelfbook";

const BookPicker = ({
    allBooks,
    selectedBook,
    setSelectedBook
} : {
    allBooks: ShelfBook[],
    selectedBook: ShelfBook | null,
    setSelectedBook: (shelfBook: ShelfBook) => void
}) => {

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allBooks.map((shelfBook) => (
                <div
                    key={shelfBook.id}
                    onClick={() => setSelectedBook(shelfBook)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 16px",
                        borderRadius: 6,
                        border:
                            selectedBook?.id === shelfBook.id
                                ? "2px solid #185FA5"
                                : "1px solid #d4c9b0",
                        background:
                            selectedBook?.id === shelfBook.id ? "#f0f4ff" : "white",
                        cursor: "pointer",
                    }}
                >
                    {/* COVER */}
                    {shelfBook.book.coverUrl ? (
                        <img
                            src={shelfBook.book.coverUrl}
                            alt={shelfBook.book.name}
                            style={{
                                width: 36,
                                height: 52,
                                objectFit: "cover",
                                borderRadius: "2px 4px 4px 2px",
                                boxShadow: "1px 2px 4px rgba(0,0,0,0.2)",
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 36,
                                height: 52,
                                background: "#3a5a8b",
                                borderRadius: "2px 4px 4px 2px",
                            }}
                        />
                    )}

                    {/* TEXT */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{shelfBook.book.name}</div>
                        <div style={{ fontSize: "0.85rem", color: "#8a7d6a" }}>
                            {shelfBook.book.authors}
                        </div>
                    </div>

                    {selectedBook?.id === shelfBook.id && (
                        <div style={{ color: "#185FA5", fontWeight: 700 }}>
                            ✓
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export { BookPicker }