"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import "@/styles/quiz.css";
import { toast, ToastContainer } from "react-toastify";

interface Question {
  id: number;
  text: string;
  options: { label: string; text: string }[];
  answer: string;
}

interface QuizChallenge {
  id: number;
  fromUser: string;
  fromColor: string;
  title: string;
  book: string;
  author: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionCount: number;
  timeAgo: string;
  coverColor: string;
}

interface MyQuiz {
  id: number;
  title: string;
  book: string;
  author: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionCount: number;
  timeAgo: string;
  coverColor: string;
  results: { name: string; color: string; score: string; pending: boolean }[];
}

const FRIENDS = [
  { name: "Julie",   color: "#8b1a1a" },
  { name: "Vanessa", color: "#2a7a4a" },
  { name: "Fraia",   color: "#3a5a8b" },
  { name: "Natalia", color: "#5a5a5a" },
];

const CHALLENGES: QuizChallenge[] = [
  {
    id: 1,
    fromUser: "Julie",
    fromColor: "#8b1a1a",
    title: "Do you know Charlie and the Chocolate Factory?",
    book: "Charlie and the Chocolate Factory",
    author: "Roald Dahl",
    difficulty: "Easy",
    questionCount: 5,
    timeAgo: "1d ago",
    coverColor: "#8b1a1a",
  },
  {
    id: 2,
    fromUser: "Fraia",
    fromColor: "#3a5a8b",
    title: "Dune Trivia",
    book: "Dune",
    author: "Frank Herbert",
    difficulty: "Easy",
    questionCount: 5,
    timeAgo: "1d ago",
    coverColor: "#3a5a8b",
  },
];

const MY_QUIZZES: MyQuiz[] = [
  {
    id: 1,
    title: "Pachinko Deep Dive",
    book: "Pachinko",
    author: "Min Jin Lee",
    difficulty: "Easy",
    questionCount: 7,
    timeAgo: "3 days ago",
    coverColor: "#2a6a3a",
    results: [
      { name: "Julie",   color: "#8b1a1a", score: "7/7",  pending: false },
      { name: "Vanessa", color: "#2a7a4a", score: "4/7",  pending: false },
      { name: "Fraia",   color: "#3a5a8b", score: "4/7",  pending: false },
      { name: "Natalia", color: "#5a5a5a", score: "",     pending: true  },
    ],
  },
];

const LB = [
  { rank: 1, name: "Julie",   points: 61, color: "#8b1a1a" },
  { rank: 2, name: "Vanessa", points: 58, color: "#2a7a4a" },
  { rank: 3, name: "Fraia",   points: 53, color: "#3a5a8b" },
  { rank: 4, name: "Natalia", points: 52, color: "#5a5a5a" },
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

const Quiz: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const { clear: clearToken } = useLocalStorage<string>("token", "");
    const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");

    // Create quiz form state
    const [quizTitle, setQuizTitle] = useState("");
    const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
    const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

    const [isAuthorized, setIsAuthorized] = useState(false);

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
        if (!localStorage.getItem("token")) {
            toast.error("You need to be logged in to access this page.", {
                autoClose: 2000,
                onClose: () => router.push("/login"),
            });
        } else {
            setIsAuthorized(true);
        }
    }, [router]);


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
            ? {
                ...q,
                options: q.options.map((o, j) =>
                j === oIdx ? { ...o, text } : o
                ),
            }
            : q
        )
    );

    const setAnswer = (qIdx: number, label: string) =>
    setQuestions((prev) => prev.map((q, i) => (i === qIdx ? { ...q, answer: label } : q))
    );

    const isQuizValid =
        quizTitle.trim() !== "" &&
        questions.some(
            (q) =>
            q.text.trim() !== "" &&
            q.options.every((opt) => opt.text.trim() !== "") &&
            q.answer !== ""
        )
        && selectedFriends.length > 0
        ;

    const toggleFriend = (name: string) =>
    setSelectedFriends((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

    const scorePercent = (score: string) => {
    const [got, total] = score.split("/").map(Number);
    return Math.round((got / total) * 100);
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

                {/* ── Create Quiz ─────────────────────────────────── */}
                <section className="quiz-section">
                <h1 className="quiz-page-title">Create Quiz</h1>
                <p className="quiz-page-subtitle">
                    Write questions about books and challenge your friends to answer them!
                </p>

                {/* Book pill */}
                <div className="quiz-book-pill">
                    <div className="quiz-book-cover" style={{ background: "#3a5a8b" }} />
                    <div>
                    <div className="quiz-book-pill-label">Quiz About</div>
                    <div className="quiz-book-pill-title">Wuthering Heights</div>
                    <div className="quiz-book-pill-author">Emily Brontë</div>
                    </div>
                </div>

                {/* Title + Difficulty */}
                <div className="quiz-meta-row">
                    <div className="quiz-field">
                    <label className="quiz-field-label">Quiz Title</label>
                    <input
                        className="quiz-input"
                        placeholder="e.g. How well do you know Wuthering Heights?"
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

                {/* Questions */}
                {questions.map((q, qIdx) => (
                    <div key={q.id} className="quiz-question-card">
                        {/* Delete button (only for question 2+) */}
                        {qIdx > 0 && (
                        <button
                            className="quiz-delete-question-btn"
                            onClick={() => removeQuestion(qIdx)}
                        >
                            ×
                        </button>
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

                {/* Send to friends */}
                <div className="quiz-send-card">
                    <div className="quiz-send-title">Send quiz to friends</div>
                    <div className="quiz-friends-row">
                    {FRIENDS.map((f) => (
                        <div
                        key={f.name}
                        className={`quiz-friend-chip ${selectedFriends.includes(f.name) ? "selected" : ""}`}
                        onClick={() => toggleFriend(f.name)}
                        >
                        <div className="quiz-friend-avatar" style={{ background: f.color }}>
                            {f.name[0]}
                        </div>
                        <span>{f.name}</span>
                        <span className="quiz-friend-check">
                            {selectedFriends.includes(f.name) ? "✓" : ""}
                        </span>
                        </div>
                    ))}
                    </div>
                    <button className="quiz-send-btn"
                        title = {isQuizValid ? "Send quiz to selected friends" : "Please fill out the quiz and select at least one friend"}
                        disabled={!isQuizValid}>
                        Send to friends
                    </button>
                </div>
                </section>

                {/* ── Challenges + Leaderboard ─────────────────────── */}
                <div className="quiz-bottom-row">

                {/* Challenges from friends */}
                <div className="quiz-challenges-col">
                    <h2 className="quiz-section-title">Challenges from friends</h2>
                    <div className="quiz-challenges-list">
                    {CHALLENGES.map((c) => (
                        <div key={c.id} className="quiz-challenge-card">
                        <div className="quiz-challenge-header">
                            <div className="quiz-friend-avatar sm" style={{ background: c.fromColor }}>
                            {c.fromUser[0]}
                            </div>
                            <span className="quiz-challenge-from">
                            {c.fromUser} challenged you to a quiz
                            </span>
                            <span className="quiz-challenge-time">{c.timeAgo}</span>
                        </div>
                        <div className="quiz-challenge-body">
                            <div className="quiz-challenge-cover" style={{ background: c.coverColor }} />
                            <div className="quiz-challenge-info">
                            <div className="quiz-challenge-title">{c.title}</div>
                            <div className="quiz-challenge-meta">
                                {c.book} · {c.author}
                            </div>
                            <div className="quiz-challenge-meta">{c.questionCount} questions</div>
                            </div>
                            <span className={`quiz-diff-badge quiz-diff-${c.difficulty.toLowerCase()}`}>
                            {c.difficulty}
                            </span>
                        </div>
                        <div className="quiz-challenge-actions">
                            <button className="quiz-accept-btn">Accept and Start Quiz</button>
                            <button className="quiz-decline-btn">Decline</button>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="quiz-lb-col">
                    <h2 className="quiz-section-title">Leaderboard</h2>
                    <div className="quiz-lb-card">
                    {LB.map((r) => (
                        <div key={r.rank} className="quiz-lb-row">
                        <span className="quiz-lb-rank">{r.rank}</span>
                        <div className="quiz-friend-avatar sm" style={{ background: r.color }}>
                            {r.name[0]}
                        </div>
                        <span className="quiz-lb-name">{r.name}</span>
                        <span className="quiz-lb-points">{r.points} points</span>
                        </div>
                    ))}
                    <div className="quiz-lb-dots">···</div>
                    <div className="quiz-lb-row self">
                        <span className="quiz-lb-rank">8</span>
                        <div className="quiz-friend-avatar sm" style={{ background: "#7a6e5e" }}>U</div>
                        <span className="quiz-lb-name" style={{ fontWeight: 700 }}>You</span>
                        <span className="quiz-lb-points">32 points</span>
                    </div>
                    </div>
                </div>
                </div>

                {/* ── My Quizzes ───────────────────────────────────── */}
                <section>
                <h2 className="quiz-section-title">My quizzes</h2>
                {MY_QUIZZES.map((q) => (
                    <div key={q.id} className="quiz-my-card">
                    <div className="quiz-my-header">
                        <div className="quiz-my-cover" style={{ background: q.coverColor }} />
                        <div className="quiz-my-info">
                        <div className="quiz-my-title">{q.title}</div>
                        <div className="quiz-my-meta">{q.book} · {q.author}</div>
                        <div className="quiz-my-tags">
                            <span className={`quiz-diff-badge quiz-diff-${q.difficulty.toLowerCase()}`}>
                            {q.difficulty}
                            </span>
                            <span className="quiz-my-qcount">{q.questionCount} questions</span>
                        </div>
                        </div>
                        <span className="quiz-my-time">{q.timeAgo}</span>
                    </div>
                    <div className="quiz-my-results">
                        {q.results.map((r) => (
                        <div key={r.name} className="quiz-my-result-row">
                            <div className="quiz-friend-avatar sm" style={{ background: r.color }}>
                            {r.name[0]}
                            </div>
                            <span className="quiz-my-result-name">{r.name}</span>
                            {r.pending ? (
                            <span className="quiz-my-pending">pending</span>
                            ) : (
                            <>
                                <div className="quiz-my-bar-track">
                                <div
                                    className="quiz-my-bar-fill"
                                    style={{ width: `${scorePercent(r.score)}%` }}
                                />
                                </div>
                                <span className="quiz-my-score">{r.score}</span>
                            </>
                            )}
                        </div>
                        ))}
                    </div>
                    </div>
                ))}
                </section>

            </div>
            </div>
        </div>
    );
    };

export default Quiz;
