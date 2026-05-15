"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Input } from "antd";

interface AddReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => void;
  initialRating?: number;
  initialReview?: string;
}

const AddReviewModal: React.FC<AddReviewModalProps> = ({ 
  open, 
  onClose, 
  onSubmit,
  initialRating,
  initialReview
}) => {
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [reviewText, setReviewText] = useState<string>(initialReview ?? "");

  // update state when initialValues change
  useEffect(() => {
    setRating(initialRating ?? 0);
    setReviewText(initialReview ?? "");
  }, [initialRating, initialReview, open]);

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit(rating, reviewText);
    setRating(0);
    setReviewText("");
    onClose();
  };

  return (
    <Modal
      title={initialRating ? "Edit Review" : "Add Review"}
      open={open}
      onCancel={onClose}
      footer={null}
    >
      {/* Star Rating */}
      <div style={{ marginBottom: 16 }}>
        <p><b>Rating</b></p>
        <div style={{ display: "flex", gap: 8, fontSize: 32, cursor: "pointer" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => setRating(star)}
              style={{ color: star <= rating ? "#fadb14" : "#ccc" }}
            >
              ★
            </span>
          ))}
        </div>
        {rating === 0 && <p style={{ color: "red", fontSize: 12 }}>Please select a rating</p>}
      </div>

      {/* Review Text */}
      <div style={{ marginBottom: 16 }}>
        <p><b>Review</b></p>
        <Input.TextArea
          rows={4}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Write your review here..."
        />
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={handleSubmit} disabled={rating === 0}>
          {initialRating ? "Save" : "Submit"}
        </Button>
      </div>
    </Modal>
  );
};

export default AddReviewModal;