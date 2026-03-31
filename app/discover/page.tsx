"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button, Select, Modal, Input, Form, InputNumber } from "antd";
import Sidebar from "@/components/sidebar";
import { SearchOutlined } from "@ant-design/icons";

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

    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [manualForm] = Form.useForm();
    const [isbnInput, setIsbnInput] = useState("");
    const [isbnLoading, setIsbnLoading] = useState(false);
    const [manualAdding, setManualAdding] = useState(false);
    const [manualAdded, setManualAdded] = useState(false);

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
                results = results.filter((b) => (b.volumeInfo.averageRating ?? 0) >= filters.minRating);
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

    const fetchShelves = async () => {
        if (shelves.length > 0) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/library`,
                { headers: { Authorization: token ?? "" } }
            );
            const data = await res.json();
            setShelves(data.shelves ?? []);
        } catch (error) {
            console.error("Failed to fetch shelves:", error);
        }
    };

    const handleAddToShelf = async (book: GoogleBook, shelfId: number) => {
        setAddingToShelf(book.id);
        const info = book.volumeInfo;
        try {
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/library/shelves/${shelfId}/books`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: token ?? "" },
                    body: JSON.stringify({
                        googleId: book.id,
                        name: info.title,
                        authors: info.authors ?? [],
                        pages: info.pageCount ?? null,
                        releaseYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) : null,
                        genre: info.categories?.[0] ?? null,
                        description: info.description ?? null,
                    }),
                }
            );
            setAddedBooks((prev) => new Set(prev).add(`${book.id}-${shelfId}`));
            setOpenDropdownId(null);
        } catch (error) {
            console.error("Failed to add book to shelf:", error);
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
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/library/shelves/${values.shelfId}/books`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: token ?? "" },
                    body: JSON.stringify({
                        googleId: null,
                        name: values.name,
                        authors: values.authors ? values.authors.split(",").map((a: string) => a.trim()) : [],
                        pages: values.pages ?? null,
                        releaseYear: values.releaseYear ?? null,
                        genre: values.genre ?? null,
                        description: values.description ?? null,
                    }),
                }
            );
            setManualAdded(true);
            setTimeout(() => {
                setManualAdded(false);
                setManualModalOpen(false);
                manualForm.resetFields();
                setIsbnInput("");
            }, 1500);
        } catch (error) {
            console.error("Failed to add manual book:", error);
        } finally {
            setManualAdding(false);
        }
    };

    const openManualModal = () => {
        fetchShelves();
        setManualModalOpen(true);
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

    useEffect(() => {
        const randomQuery = DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];
        setDefaultLabel(randomQuery.replace("subject:", "").replace("+", " "));
        fetchBooks(randomQuery, { sortBy, genre, minRating });
    }, []);

    useEffect(() => {
        if (!searched) return;
        const activeQuery = query.trim() || "bestseller";
        if (!query.trim()) {
            setDefaultLabel(genre ? genre.replace("subject:", "").replace(/\+/g, " ") : defaultLabel);
        }
        fetchBooks(activeQuery, { sortBy, genre, minRating });
    }, [sortBy, genre, minRating]);

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        if (openDropdownId) document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openDropdownId]);

    const handleSearch = () => fetchBooks(query, { sortBy, genre, minRating }, true);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSearch();
    };

    const totalPages = Math.ceil(books.length / BOOKS_PER_PAGE);
    const paginatedBooks = books.slice((currentPage - 1) * BOOKS_PER_PAGE, currentPage * BOOKS_PER_PAGE);

    return (
        <div className="dashboard-root">
            <Sidebar />

            <div className="dashboard-topbar">
                <h1 className="discover-topbar-title">Discover Books</h1>
                <Button className="dashboard-logout-btn" onClick={handleLogout}>Logout</Button>
            </div>

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
                            <Select className="discover-filter-select" value={minRating} onChange={setMinRating} options={RATING_OPTIONS} />
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
                                <div key={book.id} className="discover-book-card">
                                    <div className="discover-book-cover">
                                        {cover
                                            ? <img src={cover} alt={info.title} className="discover-book-img" />
                                            : <div className="discover-book-no-cover">No Cover</div>
                                        }
                                    </div>

                                    <div className="discover-book-info">
                                        <div className="discover-book-title">{info.title}</div>
                                        <div className="discover-book-meta">
                                            {info.authors?.[0] ?? "Unknown Author"} · {info.publishedDate?.slice(0, 4) ?? "—"}
                                        </div>
                                        {info.averageRating && (
                                            <div className="discover-book-rating">★ {info.averageRating.toFixed(1)} stars</div>
                                        )}
                                        {info.description && (
                                            <p className="discover-book-description">
                                                {info.description.slice(0, 220)}{info.description.length > 220 ? "…" : ""}
                                            </p>
                                        )}
                                    </div>

                                    <div className="discover-book-actions">
                                        <div className="discover-add-btn-wrapper" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                className={`discover-add-btn${isAdded ? " added" : ""}`}
                                                disabled={isAdded}
                                                onClick={() => {
                                                    if (isAdded) return;

                                                    if (preselectedShelfId) {
                                                        console.log("Adding to preselected shelf:", preselectedShelfId); // testing log
                                                        console.log("token:", localStorage.getItem("token")); // testing log 
                                                        handleAddToShelf(book, Number(preselectedShelfId));
                                                    } else {
                                                        fetchShelves();
                                                        setOpenDropdownId(openDropdownId === book.id ? null : book.id);
                                                    }
                                                }}
                                            >
                                                {isAdded ? "✓ Added!" : "Add to Shelf ▾"}
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
                                                                    onClick={() => {
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
                                        <Button className="discover-read-btn">Start Reading</Button>
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
        </div>
    );
};

export default Discover;