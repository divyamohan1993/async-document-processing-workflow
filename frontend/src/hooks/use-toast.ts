'use client';

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
}

let toastListeners: Array<(toast: Toast) => void> = [];
let toastDismissListeners: Array<(id: string) => void> = [];

export function toast(props: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substring(2, 9);
  const t = { ...props, id };
  toastListeners.forEach((listener) => listener(t));
  return id;
}

export function dismissToast(id: string) {
  toastDismissListeners.forEach((listener) => listener(id));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== t.id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const subscribe = useCallback(() => {
    toastListeners.push(addToast);
    toastDismissListeners.push(removeToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== addToast);
      toastDismissListeners = toastDismissListeners.filter((l) => l !== removeToast);
    };
  }, [addToast, removeToast]);

  return { toasts, subscribe, removeToast };
}
