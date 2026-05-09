"use client";

import { useApi } from "@/hooks/useApi";
import { useHandleErrorMessage } from "@/hooks/useHandleErrorMessage";
import { Book } from "@/types/book";
import { Shelf } from "@/types/shelf";
import { ShelfBook } from "@/types/shelfbook";
import { Button, Flex, Modal, Spin } from "antd";
import { useEffect, useState } from "react";
import { BookPicker } from "./bookPicker";

interface SelectBookModalProps {
    userId: string;
    sessionId: string;
    handleStartSession: (selectedBook: ShelfBook) => Promise<void>
}

const SelectBookModal = (props: SelectBookModalProps) => {
    const { userId, sessionId, handleStartSession } = props;
    const apiService = useApi();
    const { handleErrorMessage } = useHandleErrorMessage();
    const [books, setBooks] = useState<ShelfBook[] | null>(null);
    const [selectedBook, setSelectedBook] = useState<ShelfBook | null>(null);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const data = await apiService.get<Shelf[]>(`/users/${userId}/library/shelves`);
                setBooks(data.flatMap(x => x.shelfBooks ?? []));
            } catch (error) {
                handleErrorMessage(error);
            }
        }
        
        void fetchBooks();
    }, []);

    return (
        <Modal
            centered
            title="Select a book and join the session!"
            open
            footer={null}
        >
        <Flex align="center" justify="center">
            {!books
                ? <Spin style={{ padding: 8 }} spinning /> 
                : <BookPicker selectedBook={selectedBook} setSelectedBook={setSelectedBook} allBooks={books} />}
        </Flex>
        <Flex align="center" justify="center" style={{ marginTop: 20 }}>
            <Button
                className="bookshelf-session-btn-resume"
                onClick={async ()=> {
                    try {
                        await apiService.put(`/users/${userId}/sessions/${sessionId}/joined`, { shelfBookId: selectedBook!.id }); 
                        await handleStartSession(selectedBook!);
                    } catch (error) {
                        handleErrorMessage(error);
                    }
                }}
                disabled={!selectedBook}
                style={{ minWidth: 240, height: 44 }}
            >
                Start Shared Session
            </Button>
        </Flex>
    </Modal>
    );
};

export { SelectBookModal }