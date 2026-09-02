"use client";

import { useState } from "react";
import { Volume2, Bookmark, BookmarkCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { cn } from "@/lib/utils";

interface InteractiveTranscriptProps {
  text: string;
  className?: string;
  isAI?: boolean;
}

// Built-in lightweight phonetic/meaning dictionary for key conversational vocabulary
const WORD_DICT: Record<string, { ipa: string; pos: string; vi: string }> = {
  challenge: { ipa: "/ˈtʃæl.ɪndʒ/", pos: "noun/verb", vi: "Thử thách, thách thức" },
  difficult: { ipa: "/ˈdɪf.ɪ.kəlt/", pos: "adj", vi: "Khó khăn, phức tạp" },
  explain: { ipa: "/ɪkˈspleɪn/", pos: "verb", vi: "Giải thích, làm rõ" },
  opinion: { ipa: "/əˈpɪn.jən/", pos: "noun", vi: "Ý kiến, quan điểm" },
  actually: { ipa: "/ˈæk.tʃu.ə.li/", pos: "adv", vi: "Thực ra là, trên thực tế" },
  definitely: { ipa: "/ˈdef.ɪ.nət.li/", pos: "adv", vi: "Chắc chắn, hiển nhiên" },
  persuade: { ipa: "/pɚˈsweɪd/", pos: "verb", vi: "Thuyết phục" },
  negotiate: { ipa: "/nəˈɡoʊ.ʃi.eɪt/", pos: "verb", vi: "Đàm phán, thương lượng" },
  clarify: { ipa: "/ˈklær.ə.faɪ/", pos: "verb", vi: "Làm rõ ý" },
  spontaneous: { ipa: "/spɑːnˈteɪ.ni.əs/", pos: "adj", vi: "Tự phát, ngẫu hứng, tự nhiên" },
  opportunity: { ipa: "/ˌɑː.pɚˈtuː.nə.t̬i/", pos: "noun", vi: "Cơ hội, thời cơ" },
  experience: { ipa: "/ɪkˈspɪr.i.əns/", pos: "noun/verb", vi: "Kinh nghiệm, trải nghiệm" },
  interesting: { ipa: "/ˈɪn.trɪ.stɪŋ/", pos: "adj", vi: "Thú vị, hấp dẫn" },
  recommend: { ipa: "/ˌrek.əˈmend/", pos: "verb", vi: "Gợi ý, khuyên bảo" },
  situation: { ipa: "/ˌsɪtʃ.uˈeɪ.ʃən/", pos: "noun", vi: "Tình huống, hoàn cảnh" },
  confidence: { ipa: "/ˈkɑːn.fə.dəns/", pos: "noun", vi: "Sự tự tin" },
  fluency: { ipa: "/ˈfluː.ən.si/", pos: "noun", vi: "Độ trôi chảy, lưu loát" },
};

export function InteractiveTranscript({ text, className, isAI = true }: InteractiveTranscriptProps) {
  const tts = useBrowserTTS();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  // Split text into words while keeping punctuation
  const tokens = text.split(/(\s+|[.,!?;:"])/);

  const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");

  const handleWordClick = (rawToken: string) => {
    const cleaned = cleanWord(rawToken);
    if (!cleaned || cleaned.length < 2) return;
    setSelectedWord(cleaned);
  };

  const handlePronounce = (w: string) => {
    tts.speak(w, { lang: "en-US", rate: 0.85 });
  };

  const toggleSaveWord = (w: string) => {
    setSavedWords((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      try {
        const list = Array.from(next);
        localStorage.setItem("engspeak_speech_bank", JSON.stringify(list));
      } catch {}
      return next;
    });
  };

  const wordInfo = selectedWord ? WORD_DICT[selectedWord] : null;

  return (
    <div className={cn("relative leading-relaxed", className)}>
      <p className="inline text-sm whitespace-pre-wrap">
        {tokens.map((token, idx) => {
          const cleaned = cleanWord(token);
          const isClickable = isAI && cleaned.length >= 2;
          const isSelected = selectedWord === cleaned;

          if (!isClickable) {
            return <span key={idx}>{token}</span>;
          }

          return (
            <span
              key={idx}
              onClick={() => handleWordClick(token)}
              className={cn(
                "cursor-pointer rounded-sm px-0.5 transition-colors hover:bg-primary/20 hover:text-primary",
                isSelected && "bg-primary/25 font-semibold text-primary underline"
              )}
            >
              {token}
            </span>
          );
        })}
      </p>

      {/* Floating Word Card */}
      {selectedWord && (
        <div className="mt-3 p-3 rounded-2xl bg-card border border-primary/30 shadow-lg animate-in fade-in zoom-in-95 duration-150 flex items-start justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground capitalize">{selectedWord}</span>
              {wordInfo && (
                <>
                  <span className="font-mono text-primary text-[11px]">{wordInfo.ipa}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                    {wordInfo.pos}
                  </Badge>
                </>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {wordInfo ? wordInfo.vi : "Bấm nút nghe để phát âm chuẩn từ này theo giọng bản ngữ."}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handlePronounce(selectedWord)}
              className="size-7 rounded-lg text-primary hover:bg-primary/10"
              aria-label="Nghe phát âm"
            >
              <Volume2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => toggleSaveWord(selectedWord)}
              className="size-7 rounded-lg text-amber-500 hover:bg-amber-500/10"
              aria-label="Lưu vào sổ tay từ vựng"
            >
              {savedWords.has(selectedWord) ? (
                <BookmarkCheck className="size-3.5 fill-amber-500" />
              ) : (
                <Bookmark className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedWord(null)}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
