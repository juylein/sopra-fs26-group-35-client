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

const AVATAR_COLORS = [
    "#8b1a1a", "#2a7a4a", "#3a5a8b", "#5a5a5a",
    "#7a4a2a", "#4a2a7a", "#2a4a7a", "#7a2a4a",
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

const SELECTED_BOOK = {
    id: 1,
    title: "Wuthering Heights",
    author: "Emily Brontë",
    coverColor: "#3a5a8b",
};

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
        if (!isQuizValid || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const quizPayload = {
                title: quizTitle,
                difficulty: difficulty.toUpperCase(),
                bookId: SELECTED_BOOK.id,
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

            const quizId = createdQuiz.id;

            await apiService.post(
                `/users/${userId}/quizzes/${quizId}/send`,
                { friendIds: selectedFriends }
            );
            toast.success("Quiz created and sent to your friends!");

            setQuizTitle("");
            setDifficulty("Easy");
            setQuestions([emptyQuestion()]);
            setSelectedFriends([]);
        } catch (error) {
            console.error("Failed to send quiz:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

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

                    {/* Create Quiz */}
                    <section className="quiz-section">
                        <h1 className="quiz-page-title">Create Quiz</h1>
                        <p className="quiz-page-subtitle">
                            Write questions about books and challenge your friends to answer them!
                        </p>

                        <div className="quiz-book-pill">
                            <div className="quiz-book-cover" style={{ background: SELECTED_BOOK.coverColor }} />
                            <div>
                                <div className="quiz-book-pill-label">Quiz About</div>
                                <div className="quiz-book-pill-title">{SELECTED_BOOK.title}</div>
                                <div className="quiz-book-pill-author">{SELECTED_BOOK.author}</div>
                            </div>
                        </div>

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

                        {questions.map((q, qIdx) => (
                            <div key={q.id} className="quiz-question-card">
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
                                        : "Please fill out the quiz and select at least one friend"
                                }
                                disabled={!isQuizValid || isSubmitting}
                                onClick={handleSend}
                            >
                                {isSubmitting ? "Sending..." : "Send to friends"}
                            </button>
                        </div>
                    </section>

                    {/* Challenges + Leaderboard */}
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
                                    const myRank = myEntry
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

                    {/* My Quizzes */}
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
                                                {r.name?.[0] ?? "?"}
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
            <ToastContainer position="top-center" />
        </div>
    );
};

export default Quiz;