'use client';

import { useAppMessage } from "./useAppMessage";
import { ApplicationError } from "@/types/error";

export const useHandleErrorMessage = () => {
  const message = useAppMessage();

  const handleErrorMessage = (error: unknown) => {
    let errorMessage = "Something went wrong.";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    if ((error as ApplicationError)?.status) {
      errorMessage = (error as ApplicationError).message;
    }

    message.error({
      content: errorMessage,
      style: { color: "#000" },
    });
  };

  return { handleErrorMessage };
};