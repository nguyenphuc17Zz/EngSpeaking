"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useSettingsStore } from "@/stores/settings-store";

export function GlobalSelectionAudio() {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const tts = useBrowserTTS();
  const ttsSetting = useSettingsStore((s) => s.tts);

  const providerLabel =
    ttsSetting?.provider === "kokoro-tts" || ttsSetting?.provider === "kokoro"
      ? "Kokoro"
      : ttsSetting?.provider === "edge-tts"
      ? "Edge Neural"
      : "Browser";

  const handleSelection = useCallback(() => {
    // Check standard text selection
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const text = selection.toString().trim();
      // Only trigger on reasonable lengths (1 word to short phrase, <= 200 chars)
      if (text.length >= 1 && text.length <= 200) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const pillWidth = 140;
            let left = rect.left + rect.width / 2 - pillWidth / 2;
            left = Math.max(10, Math.min(left, window.innerWidth - pillWidth - 10));

            let top = rect.top - 42;
            if (top < 12) {
              top = rect.bottom + 8;
            }

            setSelectedText(text);
            setPosition({ top, left });
            setVisible(true);
            return;
          }
        } catch {}
      }
    }

    // Check input/textarea selection fallback
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      if (activeEl.type !== "password") {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        if (start !== null && end !== null && start !== end) {
          const text = activeEl.value.substring(start, end).trim();
          if (text.length >= 1 && text.length <= 200) {
            const rect = activeEl.getBoundingClientRect();
            const pillWidth = 140;
            let left = rect.left + rect.width / 2 - pillWidth / 2;
            left = Math.max(10, Math.min(left, window.innerWidth - pillWidth - 10));

            let top = rect.top - 42;
            if (top < 12) {
              top = rect.bottom + 8;
            }

            setSelectedText(text);
            setPosition({ top, left });
            setVisible(true);
            return;
          }
        }
      }
    }

    setVisible(false);
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      // Slight delay so window.getSelection() finalizes
      setTimeout(handleSelection, 20);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Arrow keys with Shift for selection
      if (e.shiftKey) {
        setTimeout(handleSelection, 20);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      setVisible(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
        tts.stop();
      }
    };

    const onScroll = () => {
      if (visible) {
        setVisible(false);
      }
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchend", onMouseUp);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchend", onMouseUp);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [handleSelection, visible, tts]);

  if (!visible || !selectedText) return null;

  const handleSpeak = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speak(sanitizeTextForTTS(selectedText));
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-[99999] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/95 dark:bg-card/90 backdrop-blur-md border border-primary/40 shadow-2xl shadow-primary/10 text-xs select-none animate-in fade-in-0 zoom-in-95 duration-150"
      onMouseDown={(e) => {
        // Prevent clearing the text selection when clicking the popover
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={handleSpeak}
        className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary transition-colors cursor-pointer group"
        title={`Nghe phát âm chuẩn qua ${providerLabel} [Settings]`}
      >
        <div
          className={`size-6 rounded-full flex items-center justify-center transition-all ${
            tts.isSpeaking
              ? "bg-primary text-primary-foreground animate-pulse scale-105"
              : "bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
          }`}
        >
          {tts.isSpeaking ? (
            <VolumeX className="size-3.5" />
          ) : (
            <Volume2 className="size-3.5" />
          )}
        </div>
        <span className="text-[11px] tracking-tight">
          {tts.isSpeaking ? "Dừng" : "Phát âm"}
        </span>
      </button>

      <span className="w-px h-3 bg-border/60" />

      <span
        className="text-[9px] font-mono font-medium text-muted-foreground/80 px-1 py-0.5 rounded bg-muted/50 truncate max-w-[70px]"
        title={`Đang dùng bộ máy: ${providerLabel} (theo cài đặt Settings)`}
      >
        {providerLabel}
      </span>
    </div>
  );
}
