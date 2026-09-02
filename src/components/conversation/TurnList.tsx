"use client";

import { useState, useRef } from "react";
import type { ConversationTurn } from "@/types/conversation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  User,
  Sparkles,
  Clock,
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Square,
  Lightbulb,
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
      <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-muted/10">
        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-2xs">
          <MessageSquare className="size-6" />
        </div>
        <h4 className="text-sm font-bold text-foreground">Sẵn sàng đối thoại</h4>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs leading-relaxed">
          Nhấn nút Micro hoặc phím <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-[10px]">Space</kbd> để bắt đầu nói.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {turns.map((t) => {
        const isUser = t.role === "user";
        const ped = t.pedagogy;
        const isPlayingThisAudio = playingAudioId === t.id;

        return (
          <div
            key={t.id}
            className={cn(
              "flex gap-2.5 max-w-[94%] transition-all",
              isUser ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* Avatar Icon */}
            <div
              className={cn(
                "size-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5 shadow-2xs",
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white"
              )}
            >
              {isUser ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
            </div>

            {/* Bubble Content */}
            <div
              className={cn(
                "flex flex-col rounded-2xl px-3.5 py-2.5 shadow-xs space-y-1.5 border text-xs sm:text-[13px] leading-relaxed",
                isUser
                  ? "bg-card border-primary/30 text-card-foreground rounded-tr-xs"
                  : "bg-muted/40 border-border/70 text-card-foreground rounded-tl-xs"
              )}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={cn("font-bold", isUser ? "text-primary" : "text-foreground")}>
                    {isUser ? "Bạn" : "AI Coach"}
                  </span>
                  {isUser && ped?.turnScore && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0 h-4",
                        ped.turnScore >= 85
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : ped.turnScore >= 70
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-red-500/15 text-red-600 dark:text-red-400"
                      )}
                    >
                      {ped.turnScore}đ
                    </Badge>
                  )}
                  {isUser && ped?.latencyMs && (
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono text-muted-foreground flex items-center gap-0.5 px-1 py-0 h-4"
                    >
                      <Zap className="size-2 text-amber-500" />
                      {(ped.latencyMs / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
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

              {/* Main Message Text */}
              <p className="font-medium text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {t.text}
              </p>

              {/* Raw Transcript (if slightly different) */}
              {t.rawText && t.rawText !== t.text && (
                <p className="text-[10px] italic text-muted-foreground border-t border-border/30 pt-0.5">
                  STT: "{t.rawText}"
                </p>
              )}

              {/* User Per-Turn Feedback (Pedagogy) */}
              {isUser && ped && (
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  {/* Corodomo Audio: Listen back to my recording */}
                  {ped.audioBlobUrl && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePlayUserAudio(t.id, ped.audioBlobUrl!)}
                        className={cn(
                          "h-6 px-2 rounded-lg text-[11px] font-bold gap-1 transition-all",
                          isPlayingThisAudio
                            ? "bg-indigo-500/20 text-indigo-600 border-indigo-500/50 shadow-2xs"
                            : "text-muted-foreground hover:text-indigo-600 hover:border-indigo-500/40"
                        )}
                      >
                        {isPlayingThisAudio ? (
                          <Square className="size-2.5 fill-current text-indigo-500" />
                        ) : (
                          <Headphones className="size-2.5 text-indigo-500" />
                        )}
                        <span>{isPlayingThisAudio ? "Đang phát..." : "Nghe lại giọng tôi"}</span>
                      </Button>
                    </div>
                  )}

                  {/* Grammar Issue & Fix */}
                  {ped.grammarIssue && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] space-y-0.5">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>Sửa ngữ pháp:</span>
                      </div>
                      <p className="text-foreground/90">{ped.grammarIssue}</p>
                      {ped.grammarFix && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                          ✓ Sửa: "{ped.grammarFix}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Native Reformulation */}
                  {ped.nativeReformulation && ped.nativeReformulation !== t.text && (
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                          <Sparkles className="size-2.5" /> Nói tự nhiên hơn:
                        </span>
                        <button
                          onClick={() => handlePlayTTS(ped.nativeReformulation!)}
                          className="text-indigo-600 hover:text-indigo-700 transition-colors"
                          title="Nghe phát âm bản xứ"
                        >
                          <Volume2 className="size-3" />
                        </button>
                      </div>
                      <p className="text-foreground font-semibold italic">
                        "{ped.nativeReformulation}"
                      </p>
                    </div>
                  )}

                  {/* Coach tip */}
                  {ped.coachTipVi && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 italic">
                      <Lightbulb className="size-2.5 text-amber-500 shrink-0" />
                      <span>{ped.coachTipVi}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Actions for Assistant */}
              {!isUser && (
                <div className="pt-0.5 flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayTTS(t.text)}
                    className="h-6 px-2 text-[11px] font-semibold gap-1 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10"
                    title="Nghe câu này"
                  >
                    <Volume2 className="size-3 text-primary" />
                    <span>Nghe câu này</span>
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
