"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, BookmarkPlus, X } from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!anchorEl || !word) return;
    const rect = anchorEl.getBoundingClientRect();
    const popupWidth = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 200 ? rect.bottom + 6 : rect.top - 6;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8));
    setPosition({ top, left });
    setSaved(false);
  }, [anchorEl, word]);

  // Close on outside click
  useEffect(() => {
    if (!word) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
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
  }, [word, onClose]);

  if (!word) return null;

  const handleSave = () => {
    onSaveToDeck(word);
    setSaved(true);
  };

  const handlePlay = () => {
    tts.speak(sanitizeTextForTTS(word.word));
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-[200] w-[280px] rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handlePlay}
            className="text-primary hover:text-primary/80 transition-colors shrink-0"
            title="Nghe phát âm"
          >
            <Volume2 className="size-4" />
          </button>
          <span className="font-extrabold text-base text-foreground font-mono truncate">
            {word.word}
          </span>
          {word.cefrLevel && (
            <Badge variant="outline" className="text-[10px] font-mono shrink-0 px-1.5 py-0">
              {word.cefrLevel}
            </Badge>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3.5 py-2.5 space-y-2">
        {word.ipa && (
          <p className="text-xs font-mono text-muted-foreground">{word.ipa}</p>
        )}
        {word.partOfSpeech && (
          <span className="inline-block text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">
            {word.partOfSpeech}
          </span>
        )}
        {word.meaning && (
          <p className="text-sm font-semibold text-foreground leading-snug">{word.meaning}</p>
        )}
        {word.contextSentence && (
          <div className="p-2 rounded-xl bg-muted/50 border border-border/60">
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              "{word.contextSentence}"
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3.5 pb-3">
        <Button
          size="sm"
          variant={saved ? "outline" : "default"}
          onClick={handleSave}
          disabled={saved}
          className="w-full h-8 rounded-xl text-xs font-bold gap-1.5"
        >
          <BookmarkPlus className="size-3.5" />
          <span>{saved ? "✓ Đã lưu vào Deck" : "Lưu vào Deck"}</span>
        </Button>
      </div>
    </div>
  );
}
