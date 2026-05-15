"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import "@/styles/quiz.css";
import { toast, ToastContainer } from "react-toastify";
import { UserStats } from "@/types/leaderboard";
import { User } from "@/types/user";
import { Shelf } from "@/types/shelf";
import { Book } from "@/types/book";
import { useHandleErrorMessage } from "@/hooks/useHandleErrorMessage";

interface Question {
    id: number;
    text: string;
    options: { label: string; text: string }[];
    answer: string;
}

interface NotificationGetDTO {
    id: number;
    type: string;
    message: string;
    referenceId: number | null;
    read: boolean;
    createdAt: string;
}

interface QuizResultEntryDTO {
    userId: number;
    username: string;
    scoreGot: number | null;
    scoreTotal: number;
    pending: boolean;
}

interface MyQuizSummaryDTO {
    id: number;
    title: string | null;
    difficulty: string | null;
    bookId: number | null;
    createdAt: string | null;
    questionCount: number;
    results: QuizResultEntryDTO[] | null;
}

const AVATAR_COLORS = [
    "#8b1a1a", "#2a7a4a", "#3a5a8b", "#5a5a5a",
    "#7a4a2a", "#4a2a7a", "#2a4a7a", "#7a2a4a",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
type Difficulty = typeof DIFFICULTIES[number];

const emptyQuestion = (): Question => ({
    id: Date.now(),
    text: "",
    options: [
        { label: "A", text: "" },
        { label: "B", text: "" },
        { label: "C", text: "" },
        { label: "D", text: "" },
    ],
    answer: "",
});

function avatarColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function relativeTime(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.round(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    const days = Math.round(diff / 86400);
    if (days === 1)   return "Yesterday";
    if (days < 30)    return `${days} days ago`;
    if (days < 365)   return `${Math.round(days / 30)} months ago`;
    return `${Math.round(days / 365)} years ago`;
}

function isValidQuiz(q: MyQuizSummaryDTO | null): q is MyQuizSummaryDTO & { title: string } {
    return q !== null && !!q.title;
}

const Quiz: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const { handleErrorMessage } = useHandleErrorMessage();
    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

    const [quizTitle, setQuizTitle]             = useState("");
    const [difficulty, setDifficulty]           = useState<Difficulty>("Easy");
    const [questions, setQuestions]             = useState<Question[]>([emptyQuestion()]);
    const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
    const [friends, setFriends]                 = useState<User[]>([]);
    const [isSubmitting, setIsSubmitting]       = useState(false);
    const [isAuthorized, setIsAuthorized]       = useState(false);
    const [quizLeaderboard, setQuizLeaderboard] = useState<UserStats[]>([]);
    const [challenges, setChallenges]           = useState<NotificationGetDTO[]>([]);
    const [myQuiz, setMyQuiz]                   = useState<MyQuizSummaryDTO | null>(null);
    const [myQuizLoading, setMyQuizLoading]     = useState(true);

    const [bookModalOpen, setBookModalOpen]     = useState(false);
    const [shelves, setShelves]                 = useState<Shelf[]>([]);
    const [selectedBook, setSelectedBook]       = useState<Book | null>(null);
    const [selectedShelfId, setSelectedShelfId] = useState<number | null>(null);

    const selectedShelf = shelves.find((s) => s.id === selectedShelfId) ?? null;
    const shelfBooks    = selectedShelf?.shelfBooks.map((sb) => sb.book) ?? [];

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
        const getQuizLeaderboard = async () => {
            if (!userId) return;
            try {
                const data = await apiService.get<UserStats[]>(`/users/${userId}/leaderboard/quiz`);
                setQuizLeaderboard(data);
            } catch (error) {
                handleErrorMessage(error);
            }
        };
        getQuizLeaderboard();
    }, [apiService, userId]);

    useEffect(() => {
        const getChallenges = async () => {
            if (!userId) return;
            try {
                const data = await apiService.get<NotificationGetDTO[]>(`/users/${userId}/notifications`);
                setChallenges(data.filter((n) => n.type === "QUIZ_CHALLENGE"));
            } catch (error) {
                handleErrorMessage(error);
            }
        };
        getChallenges();
    }, [apiService, userId]);

    useEffect(() => {
        const fetchFriends = async () => {
            if (!userId) return;
            try {
                const fetchedUser = await apiService.get<User>(`/users/${userId}`);
                setFriends((fetchedUser.friends ?? []).filter((f) => !!f.username));
            } catch (error) {
                handleErrorMessage(error);
            }
        };
        fetchFriends();
    }, [apiService, userId]);

    useEffect(() => {
        const fetchShelves = async () => {
            if (!userId) return;
            try {
                const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
                setShelves(data);
                setSelectedShelfId(data.find((s) => s.name === "Read")?.id ?? data[0]?.id ?? null);
            } catch (error) {
                handleErrorMessage(error);
            }
        };
        fetchShelves();
    }, [apiService, userId]);

    useEffect(() => {
        const fetchLatestQuiz = async () => {
            if (!userId) return;
            setMyQuizLoading(true);
            try {
                const data = await apiService.get<MyQuizSummaryDTO>(`/users/${userId}/quizzes/latest`);
                setMyQuiz(data ?? null);
            } catch {
                setMyQuiz(null);
            } finally {
                setMyQuizLoading(false);
            }
        };
        fetchLatestQuiz();
    }, [apiService, userId]);

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

    const addQuestion = () =>
        setQuestions((prev) => [...prev, emptyQuestion()]);

    const removeQuestion = (idx: number) =>
        setQuestions((prev) => prev.filter((_, i) => i !== idx));

    const updateQuestion = (idx: number, text: string) =>
        setQuestions((prev) =>
            prev.map((q, i) => (i === idx ? { ...q, text } : q))
        );

    const updateOption = (qIdx: number, oIdx: number, text: string) =>
        setQuestions((prev) =>
            prev.map((q, i) =>
                i === qIdx
                    ? { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, text } : o)) }
                    : q
            )
        );

    const setAnswer = (qIdx: number, label: string) =>
        setQuestions((prev) =>
            prev.map((q, i) => (i === qIdx ? { ...q, answer: label } : q))
        );

    const toggleFriend = (id: number) =>
        setSelectedFriends((prev) =>
            prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
        );

    const isQuizValid =
        quizTitle.trim() !== "" &&
        selectedBook !== null &&
        questions.some(
            (q) =>
                q.text.trim() !== "" &&
                q.options.every((opt) => opt.text.trim() !== "") &&
                q.answer !== ""
        ) &&
        selectedFriends.length > 0;

    const answerLabelToIndex = (label: string): number =>
        ["A", "B", "C", "D"].indexOf(label) + 1;

    const handleSend = async () => {
        if (!isQuizValid || isSubmitting || !selectedBook) return;
        setIsSubmitting(true);
        try {
            const quizPayload = {
                title: quizTitle,
                difficulty: difficulty.toUpperCase(),
                bookId: selectedBook.id,
                questions: questions
                    .filter(
                        (q) =>
                            q.text.trim() !== "" &&
                            q.options.every((o) => o.text.trim() !== "") &&
                            q.answer !== ""
                    )
                    .map((q) => ({
                        questionText: q.text,
                        option1: q.options[0].text,
                        option2: q.options[1].text,
                        option3: q.options[2].text,
                        option4: q.options[3].text,
                        correctOption: answerLabelToIndex(q.answer),
                    })),
            };

            const createdQuiz = await apiService.post(
                `/users/${userId}/quizzes`,
                quizPayload
            ) as { id: number };

            await apiService.post(
                `/users/${userId}/quizzes/${createdQuiz.id}/send`,
                { friendIds: selectedFriends }
            );

            toast.success("Quiz created and sent to your friends!");

            try {
                const fresh = await apiService.get<MyQuizSummaryDTO>(`/users/${userId}/quizzes/latest`);
                setMyQuiz(fresh ?? null);
            } catch {
                // not critical
            }

            setQuizTitle("");
            setDifficulty("Easy");
            setQuestions([emptyQuestion()]);
            setSelectedFriends([]);
            setSelectedBook(null);
        } catch (error) {
            console.error("Failed to send quiz:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthorized) {
        return <ToastContainer position="top-center" />;
    }

    return (
        <div className="quiz-root">
            <Sidebar />
            <TopBar title="Quiz" onLogout={handleLogout} />

            <div className="quiz-main">
                <div className="quiz-content">

                    <div className="quiz-bottom-row">
                        <div className="quiz-challenges-col">
                            <h2 className="quiz-section-title">Challenges from friends</h2>
                            <div className="quiz-challenges-list">
                                {challenges.length === 0 ? (
                                    <div className="quiz-challenge-card">
                                        <div className="quiz-lb-empty">No challenges yet.</div>
                                    </div>
                                ) : (
                                    challenges.map((c) => (
                                        <div key={c.id} className="quiz-challenge-card">
                                            <div className="quiz-challenge-header">
                                                <div
                                                    className="quiz-friend-avatar sm"
                                                    style={{ background: AVATAR_COLORS[c.id % AVATAR_COLORS.length] }}
                                                >
                                                    {c.message?.[0]?.toUpperCase() ?? "?"}
                                                </div>
                                                <span className="quiz-challenge-from">{c.message}</span>
                                                <span className="quiz-challenge-time">
                                                    {new Date(c.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="quiz-challenge-actions">
                                                <button className="quiz-accept-btn">Accept and Start Quiz</button>
                                                <button className="quiz-decline-btn">Decline</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="quiz-lb-col">
                            <h2 className="quiz-section-title">Leaderboard</h2>
                            <div className="quiz-lb-card">
                                {quizLeaderboard.length === 0 ? (
                                    <div className="quiz-lb-empty">No quiz points yet.</div>
                                ) : (
                                    quizLeaderboard.map((r, i) => (
                                        <div key={r.id ?? i} className="quiz-lb-row">
                                            <span className="quiz-lb-rank">{i + 1}</span>
                                            <div
                                                className="quiz-friend-avatar sm"
                                                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                                            >
                                                {r.username?.[0]?.toUpperCase() ?? "?"}
                                            </div>
                                            <span className="quiz-lb-name">{r.username ?? "Unknown"}</span>
                                            <span className="quiz-lb-points">{r.quizPoints ?? 0} points</span>
                                        </div>
                                    ))
                                )}
                                {(() => {
                                    if (!userId) return null;
                                    const myEntry = quizLeaderboard.find((r) => r.id === Number(userId));
                                    const myRank  = myEntry
                                        ? quizLeaderboard.findIndex((r) => r.id === Number(userId)) + 1
                                        : null;
                                    return (
                                        <>
                                            <div className="quiz-lb-dots">···</div>
                                            <div className="quiz-lb-row self">
                                                <span className="quiz-lb-rank">{myRank ?? "–"}</span>
                                                <div className="quiz-friend-avatar sm" style={{ background: "#7a6e5e" }}>
                                                    {String(userId)[0].toUpperCase()}
                                                </div>
                                                <span className="quiz-lb-name" style={{ fontWeight: 700 }}>You</span>
                                                <span className="quiz-lb-points">{myEntry?.quizPoints ?? 0} points</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <section>
                        <h2 className="quiz-section-title">My quizzes</h2>

                        {myQuizLoading ? (
                            <div className="quiz-my-card quiz-my-card--skeleton">
                                <div className="quiz-my-header">
                                    <div className="quiz-my-cover" style={{ background: "var(--color-surface-offset, #e8e6e1)" }} />
                                    <div className="quiz-my-info" style={{ flex: 1 }}>
                                        <div className="quiz-skeleton-line" style={{ width: "55%", height: "1em", marginBottom: 6 }} />
                                        <div className="quiz-skeleton-line" style={{ width: "35%", height: ".8em", marginBottom: 10 }} />
                                        <div className="quiz-skeleton-line" style={{ width: "25%", height: "1.4em", borderRadius: 999 }} />
                                    </div>
                                </div>
                            </div>
                        ) : !isValidQuiz(myQuiz) ? (
                            <div className="quiz-my-card">
                                <p className="quiz-lb-empty">
                                    You haven&apos;t created any quizzes yet. Make your first one below!
                                </p>
                            </div>
                        ) : (
                            <div key={myQuiz.id} className="quiz-my-card">
                                <div className="quiz-my-header">
                                    <div className="quiz-my-cover" style={{ background: "#2a6a3a" }} />
                                    <div className="quiz-my-info">
                                        <div className="quiz-my-title">{myQuiz.title}</div>
                                        <div className="quiz-my-meta">Book #{myQuiz.bookId}</div>
                                        <div className="quiz-my-tags">
                                            <span className={`quiz-diff-badge quiz-diff-${(myQuiz.difficulty ?? "easy").toLowerCase()}`}>
                                                {myQuiz.difficulty
                                                    ? myQuiz.difficulty.charAt(0).toUpperCase() + myQuiz.difficulty.slice(1).toLowerCase()
                                                    : "Unknown"}
                                            </span>
                                            <span className="quiz-my-qcount">
                                                {myQuiz.questionCount} question{myQuiz.questionCount !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="quiz-my-time">{relativeTime(myQuiz.createdAt)}</span>
                                </div>
                                <div className="quiz-my-results">
                                    {(myQuiz.results ?? []).map((r) => (
                                        <div key={r.userId} className="quiz-my-result-row">
                                            <div
                                                className="quiz-friend-avatar sm"
                                                style={{ background: avatarColor(r.username) }}
                                            >
                                                {r.username?.[0] ?? "?"}
                                            </div>
                                            <span className="quiz-my-result-name">{r.username}</span>
                                            {r.pending ? (
                                                <span className="quiz-my-pending">pending</span>
                                            ) : (
                                                <>
                                                    <div className="quiz-my-bar-track">
                                                        <div
                                                            className="quiz-my-bar-fill"
                                                            style={{
                                                                width: `${Math.round(((r.scoreGot ?? 0) / r.scoreTotal) * 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="quiz-my-score">{r.scoreGot}/{r.scoreTotal}</span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="quiz-section">
                        <h1 className="quiz-page-title">Create Quiz</h1>
                        <p className="quiz-page-subtitle">
                            Write questions about books and challenge your friends to answer them!
                        </p>

                        <div className="quiz-book-picker">
                            <button
                                className="quiz-book-pick-btn"
                                onClick={() => setBookModalOpen(true)}
                            >
                                {selectedBook ? (
                                    <>
                                        {selectedBook.coverUrl ? (
                                            <img
                                                src={selectedBook.coverUrl}
                                                alt={selectedBook.name}
                                                className="quiz-pick-btn-cover"
                                            />
                                        ) : (
                                            <div className="quiz-pick-btn-cover quiz-pick-btn-cover-placeholder" />
                                        )}
                                        <div className="quiz-pick-btn-info">
                                            <span className="quiz-pick-btn-label">Quiz about</span>
                                            <span className="quiz-pick-btn-title">{selectedBook.name}</span>
                                            {selectedBook.authors && (
                                                <span className="quiz-pick-btn-author">{selectedBook.authors}</span>
                                            )}
                                        </div>
                                        <span className="quiz-pick-btn-change">Change</span>
                                    </>
                                ) : (
                                    <span className="quiz-pick-btn-empty">+ Choose a book from your shelves</span>
                                )}
                            </button>
                        </div>

                        {bookModalOpen && (
                            <div className="quiz-modal-overlay" onClick={() => setBookModalOpen(false)}>
                                <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
                                    <div className="quiz-modal-header">
                                        <span className="quiz-modal-title">Choose a book</span>
                                        <button className="quiz-modal-close" onClick={() => setBookModalOpen(false)}>×</button>
                                    </div>
                                    <div className="quiz-modal-tabs">
                                        {shelves.map((shelf) => (
                                            <button
                                                key={shelf.id}
                                                className={`quiz-modal-tab ${shelf.id === selectedShelfId ? "active" : ""}`}
                                                onClick={() => setSelectedShelfId(shelf.id)}
                                            >
                                                {shelf.name}
                                                <span className="quiz-modal-tab-count">{shelf.shelfBooks.length}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="quiz-modal-books">
                                        {shelfBooks.length === 0 ? (
                                            <div className="quiz-modal-empty">No books on this shelf yet.</div>
                                        ) : (
                                            shelfBooks.map((book) => (
                                                <div
                                                    key={book.id}
                                                    className={`quiz-modal-book-row ${selectedBook?.id === book.id ? "selected" : ""}`}
                                                    onClick={() => { setSelectedBook(book); setBookModalOpen(false); }}
                                                >
                                                    <div className="quiz-modal-book-cover">
                                                        {book.coverUrl ? (
                                                            <img src={book.coverUrl} alt={book.name} className="quiz-modal-book-cover-img" />
                                                        ) : (
                                                            <div className="quiz-modal-book-cover-placeholder">
                                                                {book.name.split(" ").slice(0, 2).join(" ")}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="quiz-modal-book-info">
                                                        <span className="quiz-modal-book-title">{book.name}</span>
                                                        {book.authors && (
                                                            <span className="quiz-modal-book-author">{book.authors}</span>
                                                        )}
                                                    </div>
                                                    {selectedBook?.id === book.id && (
                                                        <span className="quiz-modal-book-check">✓</span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="quiz-meta-row">
                            <div className="quiz-field">
                                <label className="quiz-field-label">Quiz Title</label>
                                <input
                                    className="quiz-input"
                                    placeholder="e.g. How well do you know this book?"
                                    value={quizTitle}
                                    onChange={(e) => setQuizTitle(e.target.value)}
                                />
                            </div>
                            <div className="quiz-field">
                                <label className="quiz-field-label">Difficulty</label>
                                <div className="quiz-difficulty-row">
                                    {DIFFICULTIES.map((d) => (
                                        <button
                                            key={d}
                                            className={`quiz-diff-btn quiz-diff-${d.toLowerCase()} ${difficulty === d ? "active" : ""}`}
                                            onClick={() => setDifficulty(d)}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {questions.map((q, qIdx) => (
                            <div key={q.id} className="quiz-question-card">
                                {qIdx > 0 && (
                                    <button className="quiz-delete-question-btn" onClick={() => removeQuestion(qIdx)}>×</button>
                                )}
                                <div className="quiz-question-label">Question {qIdx + 1}</div>
                                <input
                                    className="quiz-question-input"
                                    placeholder="Enter your question..."
                                    value={q.text}
                                    onChange={(e) => updateQuestion(qIdx, e.target.value)}
                                />
                                <div className="quiz-options-grid">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={opt.label} className="quiz-option-row">
                                            <span className="quiz-option-label">{opt.label}</span>
                                            <input
                                                className="quiz-option-input"
                                                placeholder={`Option ${opt.label}`}
                                                value={opt.text}
                                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="quiz-answer-row">
                                    <span className="quiz-answer-label">Answer:</span>
                                    {q.options.map((opt) => (
                                        <button
                                            key={opt.label}
                                            className={`quiz-answer-btn ${q.answer === opt.label ? "active" : ""}`}
                                            onClick={() => setAnswer(qIdx, opt.label)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button className="quiz-add-question-btn" onClick={addQuestion}>
                            + Add another question
                        </button>

                        <div className="quiz-send-card">
                            <div className="quiz-send-title">Send quiz to friends</div>
                            <div className="quiz-friends-row">
                                {friends.length === 0 ? (
                                    <span className="quiz-no-friends">No friends found. Add some friends first!</span>
                                ) : (
                                    friends.map((f, idx) => (
                                        <div
                                            key={f.id}
                                            className={`quiz-friend-chip ${selectedFriends.includes(f.id) ? "selected" : ""}`}
                                            onClick={() => toggleFriend(f.id)}
                                        >
                                            <div
                                                className="quiz-friend-avatar"
                                                style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                                            >
                                                {f.username?.[0]?.toUpperCase() ?? "?"}
                                            </div>
                                            <span>{f.username ?? "Unknown"}</span>
                                            <span className="quiz-friend-check">
                                                {selectedFriends.includes(f.id) ? "✓" : ""}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button
                                className="quiz-send-btn"
                                title={
                                    isQuizValid
                                        ? "Send quiz to selected friends"
                                        : "Please fill out the quiz, select a book, and select at least one friend"
                                }
                                disabled={!isQuizValid || isSubmitting}
                                onClick={handleSend}
                            >
                                {isSubmitting ? "Sending..." : "Send to friends"}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
            <ToastContainer position="top-center" />
        </div>
    );
};

export default Quiz;