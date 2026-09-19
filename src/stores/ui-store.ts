"use client";

import { create } from "zustand";

interface UiState {
  hideAppHeader: boolean;
  setHideAppHeader: (hide: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  hideAppHeader: false,
  setHideAppHeader: (hide) => set({ hideAppHeader: hide }),
}));
