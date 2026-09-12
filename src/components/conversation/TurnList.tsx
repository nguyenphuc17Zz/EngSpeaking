"use client";

import { useState, useRef } from "react";
import type { ConversationTurn } from "@/types/conversation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  User,
  Clock,
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Square,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface TurnListProps {
  turns: ConversationTurn[];
}

export function TurnList({ turns }: TurnListProps) {
  const tts = useBrowserTTS();
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayTTS = (text: string) => {
    tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.95 });
  };

  const handleTogglePlayUserAudio = (turnId: string, audioUrl: string) => {
    if (playingAudioId === turnId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    setPlayingAudioId(turnId);

    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);
    audio.play().catch(() => setPlayingAudioId(null));
  };

  if (turns.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 paper-shadow-sm">
        <div className="size-12 rounded-2xl bg-secondary text-primary border border-border/70 flex items-center justify-center mb-3">
          <MessageSquare className="size-5" />
        </div>
        <h4 className="text-base font-serif font-bold text-foreground">Không gian đàm thoại sẵn sàng</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
          Nhấn nút Micro hoặc phím <kbd className="px-1.5 py-0.5 bg-secondary border border-border/60 rounded font-mono text-[10px] text-foreground">Space</kbd> để cất lời đối thoại.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {turns.map((t) => {
        const isUser = t.role === "user";
        const ped = t.pedagogy;
        const isPlayingThisAudio = playingAudioId === t.id;

        return (
          <div
            key={t.id}
            className={cn(
              "flex gap-3 max-w-[94%] transition-all",
              isUser ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* Avatar Icon */}
            <div
              className={cn(
                "size-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5 shadow-2xs border",
                isUser
                  ? "bg-primary text-primary-foreground border-primary/40"
                  : "bg-secondary text-primary border-border/80"
              )}
            >
              {isUser ? <User className="size-4" /> : <Volume2 className="size-4" />}
            </div>

            {/* Bubble Content */}
            <div
              className={cn(
                "flex flex-col rounded-2xl px-4 py-3 paper-shadow-sm space-y-2 border text-xs sm:text-[13px] leading-relaxed",
                isUser
                  ? "bg-card border-border/90 text-foreground rounded-tr-xs"
                  : "bg-secondary/70 border-border/70 text-foreground rounded-tl-xs"
              )}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={cn("font-serif font-bold", isUser ? "text-primary" : "text-foreground")}>
                    {isUser ? "Học viên" : "AI Tutor"}
                  </span>
                  {isUser && ped?.turnScore && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0 h-4 border",
                        ped.turnScore >= 85
                          ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
                          : ped.turnScore >= 70
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      )}
                    >
                      {ped.turnScore}đ
                    </Badge>
                  )}
                  {isUser && ped?.latencyMs && (
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono text-muted-foreground flex items-center gap-0.5 px-1 py-0 h-4 border-border/80"
                    >
                      <Zap className="size-2 text-primary" />
                      {(ped.latencyMs / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  {t.durationMs ? (
                    <span className="flex items-center gap-0.5">
                      <Clock className="size-2.5" />
                      {(t.durationMs / 1000).toFixed(1)}s
                    </span>
                  ) : null}
                  <span>
                    {new Date(t.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Main Message Text (Editorial Serif) */}
              <p className="font-serif text-[14px] sm:text-[15px] font-medium text-foreground whitespace-pre-wrap break-words leading-relaxed tracking-normal">
                {t.text}
              </p>

              {/* Raw Transcript (if slightly different) */}
              {t.rawText && t.rawText !== t.text && (
                <p className="text-[11px] italic text-muted-foreground border-t border-border/40 pt-1">
                  Nhận diện âm: "{t.rawText}"
                </p>
              )}

              {/* User Per-Turn Feedback (Pedagogy) */}
              {isUser && ped && (
                <div className="space-y-2 pt-1.5 border-t border-border/50">
                  {/* Listen back to my recording */}
                  {ped.audioBlobUrl && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePlayUserAudio(t.id, ped.audioBlobUrl!)}
                        className={cn(
                          "h-6 px-2.5 rounded-lg text-[11px] font-semibold gap-1.5 transition-all border-border/80",
                          isPlayingThisAudio
                            ? "bg-primary/10 text-primary border-primary/40 shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {isPlayingThisAudio ? (
                          <Square className="size-2.5 fill-current text-primary" />
                        ) : (
                          <Headphones className="size-2.5 text-primary" />
                        )}
                        <span>{isPlayingThisAudio ? "Đang phát lại..." : "Nghe lại câu vừa nói"}</span>
                      </Button>
                    </div>
                  )}

                  {/* Grammar Issue & Fix */}
                  {ped.grammarIssue && (
                    <div className="p-2.5 rounded-xl bg-card border border-amber-600/30 text-[11px] space-y-1 paper-shadow-sm">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>Góp ý ngữ pháp:</span>
                      </div>
                      <p className="text-foreground/90 font-sans">{ped.grammarIssue}</p>
                      {ped.grammarFix && (
                        <p className="text-chart-2 font-serif font-semibold">
                          ✓ Đề xuất chuẩn: "{ped.grammarFix}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Native Reformulation */}
                  {ped.nativeReformulation && ped.nativeReformulation !== t.text && (
                    <div className="p-2.5 rounded-xl bg-card border border-chart-2/30 text-[11px] space-y-1 paper-shadow-sm">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-chart-2 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="size-3" /> Nói tự nhiên hơn:
                        </span>
                        <button
                          onClick={() => handlePlayTTS(ped.nativeReformulation!)}
                          className="text-chart-2 hover:opacity-80 transition-opacity p-0.5"
                          title="Nghe phát âm bản xứ"
                        >
                          <Volume2 className="size-3.5" />
                        </button>
                      </div>
                      <p className="text-foreground font-serif font-semibold text-[13px] italic">
                        "{ped.nativeReformulation}"
                      </p>
                    </div>
                  )}

                  {/* Coach tip */}
                  {ped.coachTipVi && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 italic">
                      <Lightbulb className="size-3 text-primary shrink-0" />
                      <span>{ped.coachTipVi}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Actions for Assistant */}
              {!isUser && (
                <div className="pt-1 flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayTTS(t.text)}
                    className="h-6 px-2 text-[11px] font-semibold gap-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-secondary"
                    title="Nghe câu này"
                  >
                    <Volume2 className="size-3 text-primary" />
                    <span>Nghe lại câu này</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
