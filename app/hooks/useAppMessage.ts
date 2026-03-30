'use client';

import { App } from "antd";

export const useAppMessage = () => {
  const { message } = App.useApp();
  return message;
};