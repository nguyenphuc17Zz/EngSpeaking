import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning" | "celebrate";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  durationMs?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      ...toast,
      id,
      durationMs: toast.durationMs ?? 4000,
    };
    set((state) => ({ toasts: [...state.toasts.slice(-4), newToast] }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearAll: () => set({ toasts: [] }),
}));

// Quick API helper
export const toast = {
  success: (title: string, description?: string, durationMs = 3500) =>
    useToastStore.getState().addToast({ type: "success", title, description, durationMs }),
  error: (title: string, description?: string, durationMs = 5000) =>
    useToastStore.getState().addToast({ type: "error", title, description, durationMs }),
  info: (title: string, description?: string, durationMs = 3500) =>
    useToastStore.getState().addToast({ type: "info", title, description, durationMs }),
  warning: (title: string, description?: string, durationMs = 4000) =>
    useToastStore.getState().addToast({ type: "warning", title, description, durationMs }),
  celebrate: (title: string, description?: string, durationMs = 4500) =>
    useToastStore.getState().addToast({ type: "celebrate", title, description, durationMs }),
  custom: (toastItem: Omit<ToastItem, "id">) =>
    useToastStore.getState().addToast(toastItem),
};
