"use client";

import { create } from "zustand";

export type IndustrialThemeId = "anvil" | "te-op1" | "vanguard" | "riso" | "os99";

export interface IndustrialThemeMeta {
  id: IndustrialThemeId;
  code: string;
  name: string;
  shortName: string;
  subtitle: string;
  swatchPrimary: string;
  swatchSecondary: string;
  swatchBg: string;
  isDark: boolean;
}

export const INDUSTRIAL_THEMES: IndustrialThemeMeta[] = [
  {
    id: "anvil",
    code: "01",
    name: "SPEAK.SH // ANVIL BLUEPRINT",
    shortName: "01.ANVIL",
    subtitle: "Industrial Grid Paper • Safety Orange #FF5500 • Acid Lime #CCFF00",
    swatchPrimary: "#FF5500",
    swatchSecondary: "#CCFF00",
    swatchBg: "#F6F4EE",
    isDark: false,
  },
  {
    id: "te-op1",
    code: "02",
    name: "TE-FIELD OP // SWISS HARDWARE",
    shortName: "02.TE-OP1",
    subtitle: "Anodized Aluminum #E6E4DD • Signal Red #FF3B00 • Cobalt #0047FF",
    swatchPrimary: "#FF3B00",
    swatchSecondary: "#0047FF",
    swatchBg: "#E6E4DD",
    isDark: false,
  },
  {
    id: "vanguard",
    code: "03",
    name: "VANGUARD.OS // CYBER PHOSPHOR",
    shortName: "03.VANGUARD",
    subtitle: "CRT Carbon #07100B • Phosphor Green #00FF66 • Amber #FFB000",
    swatchPrimary: "#00FF66",
    swatchSecondary: "#FFB000",
    swatchBg: "#07100B",
    isDark: true,
  },
  {
    id: "riso",
    code: "04",
    name: "RISO.CAD // EDITORIAL BLUEPRINT",
    shortName: "04.RISO",
    subtitle: "Archival Paper #FAF6EE • Cobalt Ink #0038FF • Vermilion #FF2A00",
    swatchPrimary: "#0038FF",
    swatchSecondary: "#FF2A00",
    swatchBg: "#FAF6EE",
    isDark: false,
  },
  {
    id: "os99",
    code: "05",
    name: "SYSTEM-99 // RETRO OS POP",
    shortName: "05.OS-99",
    subtitle: "Halftone Matrix #F2EFE9 • Magenta #FF2A85 • Electric Yellow #FFE600",
    swatchPrimary: "#FF2A85",
    swatchSecondary: "#FFE600",
    swatchBg: "#F2EFE9",
    isDark: false,
  },
];

export function applyIndustrialThemeToDom(themeId: IndustrialThemeId, xrayMode?: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-industrial-theme", themeId);
  const meta = INDUSTRIAL_THEMES.find((t) => t.id === themeId);
  if (meta?.isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  if (typeof xrayMode === "boolean") {
    root.setAttribute("data-xray", xrayMode ? "true" : "false");
  }
}

interface UiState {
  hideAppHeader: boolean;
  setHideAppHeader: (hide: boolean) => void;
  isLearningGuideOpen: boolean;
  setLearningGuideOpen: (open: boolean) => void;
  openLearningGuide: () => void;
  closeLearningGuide: () => void;
  industrialTheme: IndustrialThemeId;
  setIndustrialTheme: (theme: IndustrialThemeId) => void;
  cycleIndustrialTheme: () => void;
  xrayMode: boolean;
  setXrayMode: (enabled: boolean) => void;
  toggleXrayMode: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  hideAppHeader: false,
  setHideAppHeader: (hide) => set({ hideAppHeader: hide }),
  isLearningGuideOpen: false,
  setLearningGuideOpen: (open) => set({ isLearningGuideOpen: open }),
  openLearningGuide: () => set({ isLearningGuideOpen: true }),
  closeLearningGuide: () => set({ isLearningGuideOpen: false }),
  industrialTheme: "anvil",
  setIndustrialTheme: (theme) => {
    set({ industrialTheme: theme });
    try {
      localStorage.setItem("engspeak-industrial-theme", theme);
    } catch {}
    applyIndustrialThemeToDom(theme, get().xrayMode);
  },
  cycleIndustrialTheme: () => {
    const current = get().industrialTheme;
    const idx = INDUSTRIAL_THEMES.findIndex((t) => t.id === current);
    const next = INDUSTRIAL_THEMES[(idx + 1) % INDUSTRIAL_THEMES.length].id;
    get().setIndustrialTheme(next);
  },
  xrayMode: false,
  setXrayMode: (enabled) => {
    set({ xrayMode: enabled });
    try {
      localStorage.setItem("engspeak-xray-mode", String(enabled));
    } catch {}
    applyIndustrialThemeToDom(get().industrialTheme, enabled);
  },
  toggleXrayMode: () => {
    const next = !get().xrayMode;
    get().setXrayMode(next);
  },
}));
