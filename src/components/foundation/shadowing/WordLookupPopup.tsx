"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, BookmarkPlus, X, Sparkles } from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { cn } from "@/lib/utils";

interface VocabWord {
  word: string;
  ipa?: string;
  meaning?: string;
  partOfSpeech?: string;
  contextSentence?: string;
  cefrLevel?: string;
}

interface WordLookupPopupProps {
  word: VocabWord | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSaveToDeck: (word: VocabWord) => void;
}

export function WordLookupPopup({
  word,
  anchorEl,
  onClose,
  onSaveToDeck,
}: WordLookupPopupProps) {
  const tts = useBrowserTTS();
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<"top" | "bottom" | "center">("bottom");
  const [arrowLeft, setArrowLeft] = useState<number>(150);
  const [saved, setSaved] = useState(false);

  // Calculate and update position based on anchor element and viewport
  const updatePosition = useCallback(() => {
    if (!word) return;

    const popupEl = popupRef.current;
    const popupWidth = popupEl ? popupEl.offsetWidth : 300;
    const popupHeight = popupEl ? popupEl.offsetHeight : 230;

    if (!anchorEl || anchorEl === document.body) {
      // Fallback: Centered on screen if anchor element is missing or body
      setPosition({
        top: Math.max(16, Math.round((window.innerHeight - popupHeight) / 2)),
        left: Math.max(16, Math.round((window.innerWidth - popupWidth) / 2)),
      });
      setPlacement("center");
      return;
    }

    const rect = anchorEl.getBoundingClientRect();
    const margin = 12; // Margin from screen boundaries
    const gap = 10; // Clearance distance between anchor and popup

    // Center horizontally over the anchor word
    const anchorCenterX = rect.left + rect.width / 2;
    let left = anchorCenterX - popupWidth / 2;
    // Keep popup safely within screen boundaries
    left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

    // Calculate arrow position relative to the popup
    const arrowX = Math.max(18, Math.min(anchorCenterX - left, popupWidth - 18));
    setArrowLeft(arrowX);

    // Evaluate space available above and below the word
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top = 0;
    let chosenPlacement: "top" | "bottom" = "bottom";

    // Prefer displaying above so the subtitle line and controls below are never obscured
    if (spaceAbove >= popupHeight + gap + margin) {
      top = rect.top - popupHeight - gap;
      chosenPlacement = "top";
    } else if (spaceBelow >= popupHeight + gap + margin) {
      top = rect.bottom + gap;
      chosenPlacement = "bottom";
    } else {
      // Pick whichever side has more room
      if (spaceAbove >= spaceBelow) {
        top = Math.max(margin, rect.top - popupHeight - gap);
        chosenPlacement = "top";
      } else {
        top = Math.min(window.innerHeight - popupHeight - margin, rect.bottom + gap);
        chosenPlacement = "bottom";
      }
    }

    setPosition({ top: Math.round(top), left: Math.round(left) });
    setPlacement(chosenPlacement);
  }, [anchorEl, word]);

  // Update position on mount / anchor changes / resize / scroll
  useEffect(() => {
    if (!word) return;
    updatePosition();

    // Re-verify position on next animation frame after DOM measures are complete
    const raf = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [word, anchorEl, updatePosition]);

  // Instant pronunciation when popup opens or word changes
  useEffect(() => {
    if (word?.word) {
      setSaved(false);
      tts.speak(sanitizeTextForTTS(word.word));
    }
  }, [word]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!word) return;

    const handler = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        (!anchorEl || !anchorEl.contains(e.target as Node))
      ) {
        onClose();
      }
    };

    const escHandler = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [word, anchorEl, onClose]);

  if (!word) return null;

  const handleSave = () => {
    onSaveToDeck(word);
    setSaved(true);
  };

  const handlePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    tts.speak(sanitizeTextForTTS(word.word));
  };

  // Helper for highlighting the target word in the example sentence
  const renderHighlightedSentence = (sentence: string, targetWord: string) => {
    if (!sentence) return null;
    const cleanTarget = targetWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(\\b${cleanTarget}\\b)`, "gi");
    const parts = sentence.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="font-bold text-primary underline decoration-primary/40 underline-offset-2">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const getCefrBadgeStyle = (level?: string) => {
    switch (level?.toUpperCase()) {
      case "A1":
      case "A2":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "B1":
      case "B2":
        return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
      case "C1":
      case "C2":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-[250] w-[300px] rounded-2xl border border-border/80 dark:border-primary/30 bg-card/95 dark:bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/25 select-text animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Smart Direction Arrow */}
      {placement === "top" && (
        <div
          className="absolute -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-card/95 dark:bg-card/90 border-r border-b border-border/80 dark:border-primary/30 shadow-xs pointer-events-none"
          style={{ left: `${arrowLeft}px` }}
        />
      )}
      {placement === "bottom" && (
        <div
          className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-muted/50 dark:bg-muted/30 border-l border-t border-border/80 dark:border-primary/30 shadow-xs pointer-events-none"
          style={{ left: `${arrowLeft}px` }}
        />
      )}

      <div className="relative rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/50 bg-muted/40 dark:bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            {/* Quick Replay Audio Button with Speaking Pulse */}
            <button
              onClick={handlePlay}
              className={cn(
                "size-7 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer",
                tts.isSpeaking
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/40 scale-105 animate-pulse"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              )}
              title={tts.isSpeaking ? "Đang phát âm..." : "Nghe lại phát âm"}
            >
              <Volume2 className="size-3.5" />
            </button>

            <span className="font-extrabold text-base text-foreground font-mono tracking-tight truncate">
              {word.word}
            </span>

            {word.cefrLevel && (
              <Badge
                variant="outline"
                className={cn("text-[10px] font-mono shrink-0 px-1.5 py-0 border font-semibold", getCefrBadgeStyle(word.cefrLevel))}
              >
                {word.cefrLevel}
              </Badge>
            )}
          </div>

          <button
            onClick={onClose}
            className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 cursor-pointer"
            title="Đóng popup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-3.5 py-3 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {/* IPA & Part of Speech */}
          <div className="flex items-center gap-2 flex-wrap">
            {word.ipa && (
              <span className="text-xs font-mono font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                {word.ipa}
              </span>
            )}
            {word.partOfSpeech && (
              <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-md font-semibold capitalize">
                {word.partOfSpeech}
              </span>
            )}
          </div>

          {/* Meaning in Vietnamese */}
          {word.meaning && (
            <p className="text-sm font-semibold text-foreground leading-snug">
              {word.meaning}
            </p>
          )}

          {/* Context Sentence */}
          {word.contextSentence && (
            <div className="p-2.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/50">
              <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                "{renderHighlightedSentence(word.contextSentence, word.word)}"
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-3.5 pb-3 pt-1 border-t border-border/40 bg-muted/10 flex items-center gap-2">
          <Button
            size="sm"
            variant={saved ? "outline" : "default"}
            onClick={handleSave}
            disabled={saved}
            className={cn(
              "flex-1 h-8 rounded-xl text-xs font-bold gap-1.5 transition-all",
              saved ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : ""
            )}
          >
            <BookmarkPlus className="size-3.5" />
            <span>{saved ? "✓ Đã lưu vào Deck" : "Lưu vào Deck"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
