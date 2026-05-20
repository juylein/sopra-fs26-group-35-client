"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "antd";
import { toast, ToastContainer } from "react-toastify";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import "@/styles/quiz.css";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";

interface BackendQuestion {
    id: number;
    questionText: string;
    option1: string;
    option2: string;
    option3: string;
    option4: string;
}

interface Question {
    id: number;
    text: string;
    options: string[];
}

interface Quiz {
    id: number;
    title: string;
    difficulty: string;
    questions: BackendQuestion[];
}

export default function PlayQuizPage() {
    const router = useRouter();
    const params = useParams();
    const quizId = params?.id as string;

    const apiService = useApi();
    const { value: userId } = useLocalStorage<string>("id", "");

    const [questions, setQuestions] = useState<Question[]>([]);
    const [quizTitle, setQuizTitle] = useState("");
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [finished, setFinished] = useState(false);

    const mapQuestion = (q: BackendQuestion): Question => ({
        id: q.id,
        text: q.questionText,
        options: [q.option1, q.option2, q.option3, q.option4],
    });

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!userId || !quizId) return;
            try {
                setLoading(true);
                const data = await apiService.get<Quiz>(
                    `/users/${userId}/quizzes/${quizId}/take`
                );
                setQuizTitle(data.title ?? "");
                setQuestions(data.questions.map(mapQuestion));
            } catch {
                toast.error("Failed to load quiz");
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [userId, quizId]);

    const submitQuiz = async (finalAnswers: number[]) => {
        try {
            await apiService.post(
                `/users/${userId}/quizzes/${quizId}/submit`,
                { answers: finalAnswers }
            );
            setFinished(true);
        } catch {
            toast.error("Failed to submit quiz. Please try again.");
        }
    };

    const handleNext = () => {
        if (selected === null) {
            toast.error("Select an answer first!");
            return;
        }

        const newAnswers = [...answers, selected + 1];
        setAnswers(newAnswers);

        if (current === questions.length - 1) {
            submitQuiz(newAnswers);
        } else {
            setCurrent((c) => c + 1);
            setSelected(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <Sidebar />
                <div style={{ flex: 1 }}>
                    <TopBar />
                    <div className="pageWrapper">
                        <h2>Loading quiz...</h2>
                    </div>
                </div>
            </div>
        );
    }

    if (!questions.length) {
        return (
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <Sidebar />
                <div style={{ flex: 1 }}>
                    <TopBar />
                    <div className="pageWrapper">
                        <h2>No quiz data available</h2>
                    </div>
                </div>
            </div>
        );
    }

    if (finished) {
        return (
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <Sidebar />
                <div style={{ flex: 1 }}>
                    <TopBar />
                    <div className="pageWrapper">
                        <div className="card">
                            <h1>🎉 Finished!</h1>
                            <p>Your answers have been submitted successfully.</p>
                            <Button onClick={() => router.push("/quiz")}>
                                Back to Quizzes
                            </Button>
                        </div>
                    </div>
                </div>
                <ToastContainer />
            </div>
        );
    }

    const question = questions[current];

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <div style={{ flex: 1 }}>
                <TopBar />
                <div className="pageWrapper">
                    <div className="card">
                        <h2>{quizTitle}</h2>
                        <p>Question {current + 1} / {questions.length}</p>
                        <h3>{question.text}</h3>
                        <div className="options">
                            {question.options.map((opt, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelected(idx)}
                                    className={selected === idx ? "option optionSelected" : "option"}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
                            <Button
                                disabled={current === 0}
                                onClick={() => {
                                    setCurrent((c) => c - 1);
                                    setSelected(null);
                                }}
                            >
                                Back
                            </Button>
                            <Button onClick={handleNext}>
                                {current === questions.length - 1 ? "Finish" : "Next"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <ToastContainer />
        </div>
    );
}