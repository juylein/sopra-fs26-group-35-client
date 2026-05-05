"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button, Select, Modal, Input, Form, InputNumber, message } from "antd";
import Sidebar from "@/components/sidebar";
import { SearchOutlined } from "@ant-design/icons";
import { Rate } from "antd";
import TopBar from "@/components/topbar";
import "@/styles/discover.css"
import { ShelfBook } from "@/types/shelfbook";
import { toast, ToastContainer } from "react-toastify";

interface GoogleBook {
    id: string;
    volumeInfo: {
        title: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        averageRating?: number;
        pageCount?: number;
        categories?: string[];
        language?: string;
        imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
        };
    };
}

interface Shelf {
    id: number;
    name: string;
}

interface FetchFilters {
    sortBy: string;
    genre: string;
    minRating: number;
}

const DEFAULT_QUERIES = [
    "subject:fantasy", "subject:science+fiction", "subject:mystery",
    "subject:thriller", "subject:romance", "subject:horror",
    "subject:biography", "subject:adventure",
];

const GENRES = [
    { label: "All Genres", value: "" },
    { label: "Fantasy", value: "subject:fantasy" },
    { label: "Science Fiction", value: "subject:science+fiction" },
    { label: "Mystery", value: "subject:mystery" },
    { label: "Thriller", value: "subject:thriller" },
    { label: "Romance", value: "subject:romance" },
    { label: "Horror", value: "subject:horror" },
    { label: "Biography", value: "subject:biography" },
    { label: "Adventure", value: "subject:adventure" },
    { label: "Historical Fiction", value: "subject:historical+fiction" },
    { label: "Self-Help", value: "subject:self-help" },
    { label: "Crime", value: "subject:crime" },
];

const SORT_OPTIONS = [
    { label: "Relevance", value: "relevance" },
    { label: "Newest", value: "newest" },
];

const RATING_OPTIONS = [
    { label: "Any Rating", value: 0 },
    { label: "3+ Stars", value: 3 },
    { label: "4+ Stars", value: 4 },
    { label: "4.5+ Stars", value: 4.5 },
];

const MANUAL_GENRE_OPTIONS = [
    "Fantasy", "Science Fiction", "Mystery", "Thriller", "Romance",
    "Horror", "Biography", "Adventure", "Historical Fiction", "Self-Help", "Crime", "Other",
];

const BOOKS_PER_PAGE = 10;

const Discover: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const [messageApi, contextHolder] = message.useMessage();

    const searchParams = useSearchParams();
    const preselectedShelfId = searchParams.get("shelfId");

    const [query, setQuery] = useState("");
    const [books, setBooks] = useState<GoogleBook[]>([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [defaultLabel, setDefaultLabel] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const [sortBy, setSortBy] = useState("relevance");
    const [genre, setGenre] = useState("");
    const [minRating, setMinRating] = useState(0);

    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [addingToShelf, setAddingToShelf] = useState<string | null>(null);
    const [addedBooks, setAddedBooks] = useState<Set<string>>(new Set());
    const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
    const [bookModalOpen, setBookModalOpen] = useState(false);
    const [modalDropdownOpen, setModalDropdownOpen] = useState(false);

    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [manualForm] = Form.useForm();
    const [isbnInput, setIsbnInput] = useState("");
    const [isbnLoading, setIsbnLoading] = useState(false);
    const [manualAdding, setManualAdding] = useState(false);
    const [manualAdded, setManualAdded] = useState(false);

    const [isAuthorized, setIsAuthorized] = useState(false);

    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

    const fetchBooks = async (searchQuery: string, filters: FetchFilters, isUserSearch = false) => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        setSearched(false);
        try {
            const strippedQuery = searchQuery.replace(/subject:\S+/g, "").trim();
            const fullQuery = filters.genre
                ? `${strippedQuery} ${filters.genre}`.trim()
                : strippedQuery || searchQuery;

            const langParam = isUserSearch ? "" : "&langRestrict=en";
            const baseUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(fullQuery)}&maxResults=40&orderBy=relevance${langParam}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`;

            const [res1, res2] = await Promise.all([
                fetch(`${baseUrl}&startIndex=0`),
                fetch(`${baseUrl}&startIndex=40`),
            ]);
            const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

            let results: GoogleBook[] = [...(data1.items ?? []), ...(data2.items ?? [])];

            if (filters.minRating > 0) {
                const min = Number(filters.minRating);
                results = results.filter((b) => {
                    const rating = Number(b.volumeInfo.averageRating ?? 0);
                    return rating >= min;
                });
            }

            if (filters.sortBy === "newest") {
                results.sort((a, b) => {
                    const dateA = a.volumeInfo.publishedDate ?? "0";
                    const dateB = b.volumeInfo.publishedDate ?? "0";
                    return dateB.localeCompare(dateA);
                });
            }

            const seen = new Set<string>();
            results = results.filter((b) => {
                if (seen.has(b.id)) return false;
                seen.add(b.id);
                return true;
            });

            setBooks(results);
        } catch (error) {
            console.error("Failed to fetch books:", error);
            setBooks([]);
        } finally {
            setLoading(false);
            setSearched(true);
            setCurrentPage(1);
        }
    };

    const fetchShelves = async () : Promise<Shelf [] >=> {
            const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
            setShelves(data);
            return data;
        
    };

    const handleAddToShelf = async (book: GoogleBook, shelfId: number) => {
        setAddingToShelf(book.id);
        const info = book.volumeInfo;
        const coverUrl = 
        info.imageLinks?.thumbnail ??
        info.imageLinks?.smallThumbnail ??
        null;
        try {
            await apiService.post(`/users/${userId}/library/shelves/${shelfId}/books`, {
                googleId: book.id,
                name: info.title,
                authors: info.authors ?? [],
                pages: info.pageCount ?? null,
                releaseYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) : null,
                genre: info.categories?.[0] ?? null,
                description: info.description ?? null,
                coverUrl: coverUrl
            });
            setAddedBooks((prev) => new Set(prev).add(`${book.id}-${shelfId}`));
            messageApi.success(`"${info.title}" added to shelf!`);
            } catch (error: any) {            
                if (error.response?.status === 409 || error.message?.includes("already")) {
                    messageApi.success(`"${info.title}" is already in the shelf!`);
                    return;
                }

                console.error("Failed to add book to shelf:", error);
                messageApi.error("Failed to add book. Please try again.");

            } finally {
                setAddingToShelf(null);
            }
        };

    const handleIsbnLookup = async () => {
        if (!isbnInput.trim()) return;
        setIsbnLoading(true);
        try {
            const res = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnInput.trim()}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
            );
            const data = await res.json();
            const item: GoogleBook | undefined = data.items?.[0];
            if (item) {
                const info = item.volumeInfo;
                manualForm.setFieldsValue({
                    name: info.title ?? "",
                    authors: info.authors?.join(", ") ?? "",
                    pages: info.pageCount ?? null,
                    releaseYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) : null,
                    genre: info.categories?.[0] ?? "",
                    description: info.description ?? "",
                });
            }
        } catch (error) {
            console.error("ISBN lookup failed:", error);
        } finally {
            setIsbnLoading(false);
        }
    };

    const handleManualSubmit = async () => {
        try {
            const values = await manualForm.validateFields();
            setManualAdding(true);
            await apiService.post(`/users/${userId}/library/shelves/${values.shelfId}/books`, {
                googleId: null,
                name: values.name,
                authors: values.authors ? values.authors.split(",").map((a: string) => a.trim()) : [],
                pages: values.pages ?? null,
                releaseYear: values.releaseYear ?? null,
                genre: values.genre ?? null,
                description: values.description ?? null,
            });
            setManualAdded(true);
            messageApi.success(`"${values.name}" added to shelf!`);
            setTimeout(() => {
                setManualAdded(false);
                setManualModalOpen(false);
                manualForm.resetFields();
                setIsbnInput("");
            }, 1500);
        } catch (error) {
            console.error("Failed to add manual book:", error);
            messageApi.error("Failed to add book. Please try again.");
        } finally {
            setManualAdding(false);
        }
    };

    const openManualModal = () => {
        fetchShelves();
        setManualModalOpen(true);
    };


    const handleStartReading = async (book: GoogleBook) => {
        try {
            const shelvesData = await fetchShelves();
    
            const recentShelf = shelvesData.find(
                (s) => s.name === "Recent Readings"
            );
    
            if (!recentShelf) {
                throw new Error("Recent Readings shelf not found");
            }
    
            const info = book.volumeInfo;
    
            const coverUrl =
                info.imageLinks?.thumbnail ??
                info.imageLinks?.smallThumbnail ??
                null;
    
            const createdShelfBook = await apiService.post<ShelfBook>(
                `/users/${userId}/library/shelves/${recentShelf.id}/books`,
                {
                    googleId: book.id,
                    name: info.title,
                    authors: info.authors ?? [],
                    pages: info.pageCount ?? null,
                    releaseYear: info.publishedDate
                        ? parseInt(info.publishedDate.slice(0, 4))
                        : null,
                    genre: info.categories?.[0] ?? null,
                    description: info.description ?? null,
                    coverUrl: coverUrl,
                }
            );
    
            if (!createdShelfBook?.id) {
                throw new Error("Book creation failed");
            }
            setBookModalOpen(false);
            router.push(`/session`);
        } catch (err) {
            console.error(err);
            messageApi.error("Failed to start reading");
        }
    };

    const handleLogout = async (): Promise<void> => {
        try {
            if (!userId) {
                router.push("/login");
                return;
            }
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
        const randomQuery = DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];
        setDefaultLabel(randomQuery.replace("subject:", "").replace("+", " "));
        fetchBooks(randomQuery, { sortBy, genre, minRating });
    }, []);

    useEffect(() => {
        if (!searched) return;
    
        const activeQuery = query.trim() || genre || DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];
    
        setDefaultLabel(
            query.trim()
                ? query
                : genre
                    ? genre.replace("subject:", "").replace(/\+/g, " ")
                    : defaultLabel
        );
    
        fetchBooks(activeQuery, { sortBy, genre, minRating });
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        if (openDropdownId) {
            const timer = setTimeout(() => {
                document.addEventListener("click", handleClickOutside);
            }, 0);
            return () => {
                clearTimeout(timer);
                document.removeEventListener("click", handleClickOutside);
            };
        }
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openDropdownId]);

    const handleSearch = () => fetchBooks(query, { sortBy, genre, minRating }, true);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSearch();
    };

    const totalPages = Math.ceil(books.length / BOOKS_PER_PAGE);
    const paginatedBooks = books.slice((currentPage - 1) * BOOKS_PER_PAGE, currentPage * BOOKS_PER_PAGE);

    if (!isAuthorized) {
        return <ToastContainer position="top-center" />;
    }

    return (
        <div className="dashboard-root">
            {contextHolder}
            <Sidebar />

            <TopBar title="Discover Books" onLogout={handleLogout} />

            <div className="dashboard-main">
                <div className="discover-content">

                    <div className="discover-search-wrapper">
                        <SearchOutlined className="discover-search-icon" />
                        <input
                            type="text"
                            className="discover-search-input"
                            placeholder="Search for a book..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button className="discover-search-btn" onClick={handleSearch}>Search</Button>
                        <Button className="discover-manual-btn" onClick={openManualModal}>+ Add Manually</Button>
                    </div>

                    {preselectedShelfId && (
                        <div style={{ marginBottom: 10, fontSize: 17, color: "#000000" }}>
                            Adding books to selected shelf
                        </div>
                    )}

                    <div className="discover-filter-bar">
                        <div className="discover-filter-group">
                            <span className="discover-filter-label">Sort</span>
                            <Select className="discover-filter-select" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
                        </div>
                        <div className="discover-filter-group">
                            <span className="discover-filter-label">Genre</span>
                            <Select className="discover-filter-select" value={genre} onChange={setGenre} options={GENRES} />
                        </div>
                        <div className="discover-filter-group">
                            <span className="discover-filter-label">Rating</span>
                            <Select className="discover-filter-select" value={minRating} onChange={(val) => setMinRating(Number(val))} options={RATING_OPTIONS} />
                        </div>
                    </div>

                    {loading && <p className="discover-status">Searching...</p>}

                    {searched && !loading && (
                        <p className="discover-results-label">
                            {query.trim()
                                ? `${books.length} result${books.length !== 1 ? "s" : ""} for "${query}"`
                                : `Showing ${defaultLabel} books`
                            }
                        </p>
                    )}

                    {searched && !loading && books.length === 0 && (
                        <p className="discover-no-results">
                            No results found for &quot;{query}&quot;. Try adding it manually with the button above.
                        </p>
                    )}

                    <div className="discover-results-list">
                        {paginatedBooks.map((book) => {
                            const info = book.volumeInfo;
                            const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
                            const isAdded = shelves.length > 0 && shelves.every((s) => addedBooks.has(`${book.id}-${s.id}`));

                            return (
                                <div key={book.id} className="discover-book-card"   
                                onClick={() => {
                                    setSelectedBook(book);
                                    setBookModalOpen(true);
                                  }}
                                >
                                    <div className="discover-book-cover" onClick={() => {setSelectedBook(book); setBookModalOpen(true);
}}>
                                        {cover
                                            ? <img src={cover} alt={info.title} className="discover-book-img" />
                                            : <div className="discover-book-no-cover">No Cover</div>
                                        }
                                    </div>

                                    <div className="discover-book-info">
                                        <div className="discover-book-title">{info.title} 
                                        </div>
                        
                                        {info.averageRating ? (
                                        <Rate
                                            disabled
                                            allowHalf
                                            value={info.averageRating}
                                            style={{ fontSize: 14, color: "#fadb14", marginTop: 4 }}
                                         />
                                        ) : (
  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>No rating</div>
                                        )}
                                        <div className="discover-book-meta">
                                            {info.authors?.[0] ?? "Unknown Author"} · {info.publishedDate?.slice(0, 4) ?? "—"}
                                        </div>
                                       
                                        {info.description && (
                                            <p className="discover-book-description">
                                                {info.description.slice(0, 220)}{info.description.length > 220 ? "…" : ""}
                                            </p>
                                        )}
                                    </div>

                                    <div className="discover-book-actions">
                                        <div className="discover-add-btn-wrapper">
                                            <Button
                                                className={`discover-add-btn${isAdded ? " added" : ""}`}
                                                disabled={isAdded}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (isAdded) return;
                                                    if (preselectedShelfId) {
                                                        handleAddToShelf(book, Number(preselectedShelfId));
                                                    } else {
                                                        await fetchShelves();
                                                        setOpenDropdownId(openDropdownId === book.id ? null : book.id);
                                                    }
                                                }}
                                            >
                                                {isAdded ? "✓ Added!" : preselectedShelfId ? "Add to Shelf" : "Add to Shelf ▾"}
                                            </Button>
                                            {openDropdownId === book.id && !isAdded && (
                                                <div className="discover-shelf-dropdown">
                                                    {shelves.length === 0 ? (
                                                        <div className="discover-shelf-option discover-shelf-empty">No shelves yet</div>
                                                    ) : (
                                                        shelves.map((shelf) => {
                                                            const isAddedToShelf = addedBooks.has(`${book.id}-${shelf.id}`);
                                                            return (
                                                                <div
                                                                    key={shelf.id}
                                                                    className={`discover-shelf-option${isAddedToShelf ? " discover-shelf-added" : ""}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isAddedToShelf) return;
                                                                        handleAddToShelf(book, shelf.id);
                                                                    }}
                                                                >
                                                                    {addingToShelf === book.id ? "Adding…" : isAddedToShelf ? "✓ Added" : shelf.name}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <Button className="discover-read-btn"onClick={(e: React.MouseEvent<HTMLButtonElement>) => {e.stopPropagation();handleStartReading(book);}}>
                                            Start Reading
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="discover-pagination">
                            <button className="discover-page-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>← Prev</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    className={`discover-page-btn${currentPage === page ? " discover-page-btn-active" : ""}`}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button className="discover-page-btn" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next →</button>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                title="Add Book Manually"
                className="manual-book-modal"
                open={manualModalOpen}
                onCancel={() => {
                    setManualModalOpen(false);
                    manualForm.resetFields();
                    setIsbnInput("");
                    setManualAdded(false);
                }}
                footer={null}
                width={520}
            >
                <Form form={manualForm} layout="vertical">
                    <Form.Item label={<>ISBN <span className="manual-isbn-hint">(optional — auto-fills fields below)</span></>}>
                        <div className="manual-isbn-row">
                            <Input
                                className="manual-isbn-input"
                                placeholder="e.g. 9780747532743"
                                value={isbnInput}
                                onChange={(e) => setIsbnInput(e.target.value)}
                                onPressEnter={handleIsbnLookup}
                            />
                            <Button loading={isbnLoading} onClick={handleIsbnLookup}>Auto-fill</Button>
                        </div>
                    </Form.Item>

                    <Form.Item name="name" label="Title" rules={[{ required: true, message: "Title is required" }]}>
                        <Input placeholder="Book title" />
                    </Form.Item>

                    <Form.Item name="authors" label="Authors">
                        <Input placeholder="Author 1, Author 2, ..." />
                    </Form.Item>

                    <div className="manual-form-row">
                        <Form.Item name="pages" label="Pages">
                            <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 320" />
                        </Form.Item>
                        <Form.Item name="releaseYear" label="Release Year">
                            <InputNumber min={0} max={2100} style={{ width: "100%" }} placeholder="e.g. 2021" />
                        </Form.Item>
                    </div>

                    <Form.Item name="genre" label="Genre">
                        <Select
                            placeholder="Select a genre"
                            options={MANUAL_GENRE_OPTIONS.map((g) => ({ label: g, value: g }))}
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} placeholder="Short description..." />
                    </Form.Item>

                    <Form.Item name="shelfId" label="Add to Shelf" rules={[{ required: true, message: "Please select a shelf" }]}>
                        <Select
                            placeholder="Select a shelf"
                            options={shelves.map((s) => ({ label: s.name, value: s.id }))}
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        loading={manualAdding}
                        onClick={handleManualSubmit}
                        block
                        className={`manual-submit-btn${manualAdded ? " added" : ""}`}
                    >
                        {manualAdded ? "✓ Book Added!" : "Add Book"}
                    </Button>
                </Form>
            </Modal>
            <Modal
            open={bookModalOpen}
            onCancel={() => setBookModalOpen(false)}
            footer={null}
            width={700}
            className="book-details-modal"
            >
  {selectedBook && (
    <div className="book-details-content" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      
      <div className="book-details-header" style={{ display: "flex", gap: "20px" }}>
        <div className="book-details-cover" style={{ flexShrink: 0 }}>
          {selectedBook.volumeInfo.imageLinks?.thumbnail ? (
            <img
              src={selectedBook.volumeInfo.imageLinks.thumbnail}
              alt={selectedBook.volumeInfo.title}
              style={{ width: 120, height: "auto", borderRadius: 4 }}
            />
          ) : (
            <div className="discover-book-no-cover" style={{ width: 120, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", borderRadius: 4 }}>
              No Cover
            </div>
          )}
        </div>

        <div className="book-details-main" style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          <div className="book-details-title" style={{ fontSize: 22, fontWeight: 600 }}>
            {selectedBook.volumeInfo.title}
          </div>

          <div className="book-details-author" style={{ fontSize: 16, color: "#555" }}>
            {selectedBook.volumeInfo.authors?.join(", ") ?? "Unknown author"}
          </div>

          <div className="book-details-rating" style={{ marginTop: 4 }}>
            {selectedBook.volumeInfo.averageRating ? (
            <Rate
                disabled
                allowHalf
                value={selectedBook.volumeInfo.averageRating}
                style={{ fontSize: 16, color: "#fadb14" }}
            />
    ) : (
      <span style={{ fontSize: 14, color: "#999" }}>No rating</span>
    )}
  </div>

          <div className="book-details-meta" style={{ fontSize: 14, color: "#777" }}>
            {selectedBook.volumeInfo.pageCount ?? "No number available"} · {selectedBook.volumeInfo.publishedDate?.slice(0, 4) ?? "—"}
          </div>

          <div className="book-details-genres" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: 6 }}>
            {selectedBook.volumeInfo.categories?.map((g, i) => (
              <span key={i} className="book-genre-tag" style={{ background: "#eee", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      
      <div className="book-details-description" style={{ fontSize: 15, lineHeight: 1.5, color: "#333" }}>
        {selectedBook.volumeInfo.description ?? "No description available."}
      </div>

      
      <div className="book-details-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        
        <div style={{ position: "relative" }}>
  <Button
    className={`discover-add-btn${shelves.length > 0 && shelves.every((s) => addedBooks.has(`${selectedBook.id}-${s.id}`)) ? " added" : ""}`}
    onClick={async (e) => {
      e.stopPropagation();
      if (!selectedBook) return;

      if (preselectedShelfId) {
        handleAddToShelf(selectedBook, Number(preselectedShelfId));
      } else {
        await fetchShelves();
        setModalDropdownOpen((prev) => !prev);
      }
    }}
  >
    {shelves.length > 0 && shelves.every((s) => addedBooks.has(`${selectedBook.id}-${s.id}`)) ? "✓ Added!" : preselectedShelfId ? "Add to Shelf" : "Add to Shelf ▾"}
  </Button>

  {modalDropdownOpen && (
    <div
      className="discover-shelf-dropdown"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 999,
        minWidth: 160,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 4,
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        marginTop: 4,
        overflow: "hidden",
      }}
    >
      {shelves.length === 0 ? (
        <div className="discover-shelf-option discover-shelf-empty" style={{ padding: "8px 12px", color: "#777" }}>
          No shelves yet
        </div>
      ) : (
        shelves.map((shelf) => {
          const isAddedToShelf = addedBooks.has(`${selectedBook.id}-${shelf.id}`);
          return (
            <div
              key={shelf.id}
              className={`discover-shelf-option${isAddedToShelf ? " discover-shelf-added" : ""}`}
              style={{
                padding: "8px 12px",
                cursor: isAddedToShelf ? "default" : "pointer",
                background: isAddedToShelf ? "#f0f0f0" : "#fff",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isAddedToShelf) return;
                handleAddToShelf(selectedBook!, shelf.id);
                setModalDropdownOpen(false); 
              }}
            >
              {isAddedToShelf ? "✓ Added" : shelf.name}
            </div>
          );
        })
      )}
    </div>
  )}
</div>

        
        <Button className="discover-read-btn" onClick={() => { handleStartReading(selectedBook)}}>  
          Start Reading
        </Button>
      </div>
    </div>
  )}
</Modal>
        </div>
    );
};

const DiscoverPage: React.FC = () => (
    <Suspense fallback={<div>Loading...</div>}>
        <Discover />
    </Suspense>
);

export default DiscoverPage;