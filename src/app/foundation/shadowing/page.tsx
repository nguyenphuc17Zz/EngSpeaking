"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { triggerConfetti } from "@/components/ui/confetti";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { SentencePracticeCard } from "@/components/foundation/shadowing/SentencePracticeCard";
import {
  computeShadowingScore,
  type ShadowingScoreResult,
} from "@/lib/foundation/shadowing/pronunciation-scorer";
import { generateDeterministicEnhancement } from "@/lib/foundation/shadowing/deterministic-chunker";
import {
  ArrowLeft,
  Headphones,
  Link as LinkIcon,
  Clipboard,
  Library,
  BookOpen,
  Trash2,
  Loader2,
  Activity,
  Video,
  X,
  PlusCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import type {
  YouTubeTranscriptSegment,
  LinguisticAnalysisResult,
  SavedYouTubeItem,
} from "@/types/shadowing";

type SubtitleLayer = "en" | "thought_groups" | "ipa" | "vi" | "hidden";

export default function YouTubeShadowingPage() {
  const router = useRouter();
  const tts = useBrowserTTS();
  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  // ─── Video State (Pure real data, no hardcoded segments) ────────────
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [channelName, setChannelName] = useState("");
  const [segments, setSegments] = useState<YouTubeTranscriptSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  // ─── Deterministic Analysis Result (Zero AI, 0ms computation) ──────
  const [analysis, setAnalysis] = useState<LinguisticAnalysisResult | null>(null);

  // ─── UI State ─────────────────────────────────────────────────────────
  const [rightTab, setRightTab] = useState<"transcript" | "deck">("transcript");
  const [subtitleLayer, setSubtitleLayer] = useState<SubtitleLayer>("thought_groups");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // ─── Recording State ─────────────────────────────────────────────────
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "listening" | "recording" | "evaluating">("idle");
  const [score, setScore] = useState<ShadowingScoreResult | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [recordingStartMs, setRecordingStartMs] = useState(0);

  // ─── Session Stats ────────────────────────────────────────────────────
  const [sessionScores, setSessionScores] = useState<number[]>([]);

  // ─── Library State ───────────────────────────────────────────────────
  const [libraryItems, setLibraryItems] = useState<SavedYouTubeItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  // ─── Loading State (Pure network fetch for subtitles only) ───────────
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  // ─── Custom Script Modal State ────────────────────────────────────────
  const [showCustomScriptModal, setShowCustomScriptModal] = useState(false);
  const [customScriptText, setCustomScriptText] = useState("");

  // ─── Deck (saved words) ──────────────────────────────────────────────
  const [vocabDeck, setVocabDeck] = useState<any[]>([]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const currentSegment = segments[activeSegmentIndex] || null;

  // ─── YouTube Controls ────────────────────────────────────────────────
  const seekYouTubeTo = useCallback((startTime: number, autoPlay = true) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [startTime, true] }),
        "*"
      );
      if (autoPlay) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      }
      if (playbackSpeed !== 1.0) {
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "setPlaybackRate", args: [playbackSpeed] }),
            "*"
          );
        }, 300);
      }
    }
  }, [playbackSpeed]);

  const pauseYouTube = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      "*"
    );
  }, []);

  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Play Native segment (with Loop support) ──────────────────────────
  const handlePlayNative = useCallback(() => {
    if (!currentSegment) return;
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    pauseYouTube();
    tts.speak(currentSegment.text);
    seekYouTubeTo(currentSegment.start_time, true);
    const dur = (currentSegment.end_time - currentSegment.start_time) / playbackSpeed;
    loopTimeoutRef.current = setTimeout(() => {
      pauseYouTube();
      if (isLooping) {
        handlePlayNative();
      }
    }, dur * 1000 + 400);
  }, [currentSegment, seekYouTubeTo, pauseYouTube, tts, playbackSpeed, isLooping]);

  const handleToggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      if (!next && loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
      return next;
    });
  }, []);

  // ─── Navigate Segments ────────────────────────────────────────────────
  const goToSegment = useCallback(
    (idx: number) => {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      pauseYouTube();
      setActiveSegmentIndex(idx);
      setScore(null);
      setUserAudioUrl(null);
      speechRec.resetTranscript();
    },
    [speechRec, pauseYouTube]
  );

  // ─── Recording Logic ──────────────────────────────────────────────────
  const handleStartRecord = useCallback(async () => {
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    pauseYouTube();
    soundEffects.playMicStart();
    setScore(null);
    setUserAudioUrl(null);
    speechRec.resetTranscript();
    setRecordingStartMs(Date.now());
    try {
      setRecordingStatus("recording");
      await recorder.start();
      speechRec.startListening();
    } catch {
      toast.error("Lỗi Micro", "Không thể mở micro. Hãy cấp quyền truy cập.");
      setRecordingStatus("idle");
    }
  }, [recorder, speechRec, pauseYouTube]);

  const handleStopRecord = useCallback(async () => {
    if (!currentSegment) return;
    soundEffects.playMicStop();
    speechRec.stopListening();
    setRecordingStatus("evaluating");

    try {
      const recording = await recorder.stop();
      if (recording?.blob) {
        const audioUrl = URL.createObjectURL(recording.blob);
        setUserAudioUrl(audioUrl);
      }

      await new Promise((r) => setTimeout(r, 350));
      const spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();

      const durationMs = Date.now() - recordingStartMs;
      const expectedMs = ((currentSegment.end_time - currentSegment.start_time) * 1000) / playbackSpeed;
      const stressWords = analysis?.segments_enhancement?.find(
        (e) => e.segment_id === currentSegment.segment_id
      )?.stress_words ?? [];

      const result = computeShadowingScore(
        currentSegment.text,
        spokenText,
        durationMs,
        expectedMs,
        stressWords
      );

      setScore(result);
      setSessionScores((prev) => [...prev, result.overall]);

      if (result.overall >= 85) {
        soundEffects.playSuccessFanfare();
        triggerConfetti();
      } else {
        soundEffects.playAIReady();
      }
    } catch {
      toast.error("Lỗi xử lý", "Không thể hoàn tất chấm điểm.");
    } finally {
      setRecordingStatus("idle");
    }
  }, [recorder, speechRec, recordingStartMs, currentSegment, playbackSpeed, analysis]);

  const handleSaveWordToDeck = useCallback((word: any) => {
    setVocabDeck((prev) => {
      const exists = prev.some((w) => w.word.toLowerCase() === word.word.toLowerCase());
      if (exists) {
        toast.info("Đã có trong Deck", `"${word.word}" đã được lưu trước đó.`);
        return prev;
      }
      toast.success("Đã lưu vào Flashcard Deck!", `"${word.word}"`);
      return [
        {
          word: word.word,
          meaning: word.meaning,
          ipa: word.ipa,
          cefrLevel: word.cefrLevel,
          partOfSpeech: word.partOfSpeech,
        },
        ...prev,
      ];
    });
  }, []);

  const handleRetry = useCallback(() => {
    setScore(null);
    speechRec.resetTranscript();
    setRecordingStatus("idle");
  }, [speechRec]);

  // ─── Library Persistence ──────────────────────────────────────────────
  const saveToLibrary = useCallback(
    async (
      videoId: string,
      title: string,
      channel: string,
      segs: YouTubeTranscriptSegment[],
      enhancement: LinguisticAnalysisResult
    ) => {
      try {
        const item: SavedYouTubeItem = {
          id: `yt_${videoId}`,
          youtubeId: videoId,
          title,
          channel: channel || "YouTube Video",
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          cefrLevel: "Standard",
          duration: `${Math.round(segs.reduce((acc, s) => Math.max(acc, s.end_time), 0))}s`,
          segmentsCount: segs.length,
          savedAt: new Date().toISOString(),
          favorite: false,
          segments: segs,
          analysis: enhancement,
        };
        const res = await fetch("/api/shadowing/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item }),
        });
        const data = await res.json();
        if (data.items) setLibraryItems(data.items);
      } catch {}
    },
    []
  );

  const handleLoadFromLibrary = useCallback(
    (item: SavedYouTubeItem) => {
      if (!item.segments || item.segments.length === 0) {
        toast.error("Lỗi dữ liệu", "Mục này không có transcript.");
        return;
      }
      setCurrentVideoId(item.youtubeId);
      setVideoTitle(item.title);
      setChannelName(item.channel || "YouTube");
      setSegments(item.segments);
      setActiveSegmentIndex(0);
      setScore(null);
      setSessionScores([]);
      setShowLibrary(false);

      const enhanced = item.analysis || generateDeterministicEnhancement(item.segments);
      setAnalysis(enhanced);
      toast.success("Đã nạp video từ thư viện!", `"${item.title}"`);
    },
    []
  );

  const handleDeleteFromLibrary = async (item: SavedYouTubeItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/shadowing/library?youtubeId=${item.youtubeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setLibraryItems(data.items || []);
        toast.success("Đã xóa video", `"${item.title}"`);
        if (currentVideoId === item.youtubeId) {
          setCurrentVideoId(null);
          setVideoTitle("");
          setChannelName("");
          setSegments([]);
          setAnalysis(null);
        }
      } else {
        toast.error("Lỗi xóa video", data.error || "Không thể xóa video.");
      }
    } catch {
      toast.error("Lỗi xóa video", "Không thể hoàn tất lúc này.");
    }
  };

  const handleClearCurrentVideo = () => {
    pauseYouTube();
    setCurrentVideoId(null);
    setVideoTitle("");
    setChannelName("");
    setSegments([]);
    setAnalysis(null);
    setScore(null);
    setSessionScores([]);
  };

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/shadowing/library");
      const data = await res.json();
      if (Array.isArray(data.items)) {
        setLibraryItems(data.items);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // ─── Instant Deterministic Loader (0ms Latency) ─────────────────────
  const handleLoadVideo = useCallback(
    async (urlOrId: string) => {
      const clean = urlOrId.trim();
      if (!clean) return;

      const existing = libraryItems.find(
        (i) => i.youtubeId === clean || clean.includes(i.youtubeId)
      );
      if (existing && existing.segments.length > 0) {
        handleLoadFromLibrary(existing);
        return;
      }

      setIsLoadingTranscript(true);
      setScore(null);
      setSessionScores([]);
      try {
        const res = await fetch("/api/shadowing/youtube-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: clean }),
        });
        const data = await res.json();

        if (!res.ok || !data.success || !data.segments || data.segments.length === 0) {
          toast.error("Không có phụ đề YouTube", data.error || "Video không có phụ đề tiếng Anh hợp lệ.");
          if (data.canUseCustomScript) {
            setShowCustomScriptModal(true);
          }
          return;
        }

        setCurrentVideoId(data.videoId);
        const title = data.title || `YouTube (${data.videoId})`;
        const channel = data.channel || "YouTube";
        setVideoTitle(title);
        setChannelName(channel);
        setSegments(data.segments);
        setActiveSegmentIndex(0);

        // Instant deterministic Thought Groups & Stress Words calculation (0ms, no AI)
        const enhanced = generateDeterministicEnhancement(data.segments);
        setAnalysis(enhanced);

        toast.success("Nạp video thành công!", `${data.segments.length} câu phụ đề bản xứ`);
        triggerConfetti();

        await saveToLibrary(data.videoId, title, channel, data.segments, enhanced);
      } catch (err: unknown) {
        toast.error("Lỗi nạp video", err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoadingTranscript(false);
      }
    },
    [libraryItems, handleLoadFromLibrary, saveToLibrary]
  );

  const handleLoadCustomScript = async () => {
    const clean = customScriptText.trim();
    if (!clean) {
      toast.error("Thiếu nội dung", "Vui lòng dán nội dung bài nói tiếng Anh.");
      return;
    }
    setIsLoadingTranscript(true);
    setShowCustomScriptModal(false);
    setScore(null);
    setSessionScores([]);
    try {
      const res = await fetch("/api/shadowing/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim() || undefined,
          customScript: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.segments || data.segments.length === 0) {
        toast.error("Lỗi phân tích", data.error || "Không thể phân tách câu bài nói.");
        return;
      }
      setCurrentVideoId(data.videoId && data.videoId !== "custom_video" ? data.videoId : null);
      const title = data.title || "Custom Transcript";
      setVideoTitle(title);
      setChannelName("Custom Script");
      setSegments(data.segments);
      setActiveSegmentIndex(0);

      // Instant deterministic enhancement (0ms)
      const enhanced = generateDeterministicEnhancement(data.segments);
      setAnalysis(enhanced);

      toast.success("Nạp bài nói thành công!", `${data.segments.length} câu luyện tập`);
      triggerConfetti();

      await saveToLibrary(data.videoId || "custom", title, "Custom Script", data.segments, enhanced);
    } catch (err: unknown) {
      toast.error("Lỗi", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (score) {
          handleRetry();
        } else if (recordingStatus === "recording") {
          handleStopRecord();
        } else if (recordingStatus === "idle") {
          handleStartRecord();
        }
      } else if (e.code === "ArrowRight" || e.code === "BracketRight") {
        e.preventDefault();
        if (activeSegmentIndex < segments.length - 1) goToSegment(activeSegmentIndex + 1);
      } else if (e.code === "ArrowLeft" || e.code === "BracketLeft") {
        e.preventDefault();
        if (activeSegmentIndex > 0) goToSegment(activeSegmentIndex - 1);
      } else if (e.code === "Enter" && score) {
        e.preventDefault();
        if (activeSegmentIndex < segments.length - 1) goToSegment(activeSegmentIndex + 1);
      } else if (e.code === "KeyR" && recordingStatus === "idle" && !score) {
        e.preventDefault();
        handleRetry();
      } else if (e.code === "KeyP") {
        e.preventDefault();
        handlePlayNative();
      } else if (e.code === "Escape") {
        e.preventDefault();
        router.push("/foundation");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    score,
    recordingStatus,
    activeSegmentIndex,
    segments.length,
    goToSegment,
    handleRetry,
    handleStartRecord,
    handleStopRecord,
    handlePlayNative,
    router,
  ]);

  const avgScore = useMemo(() => {
    if (sessionScores.length === 0) return null;
    return Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length);
  }, [sessionScores]);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setYoutubeUrl(text);
        handleLoadVideo(text);
      }
    } catch {
      toast.error("Không thể dán", "Vui lòng dán thủ công bằng Ctrl+V.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background select-none overflow-hidden">
      {/* ── TOP NAV BAR ── */}
      <header className="h-14 border-b border-border/80 bg-card/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-10">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <Link href="/foundation">
            <Button variant="ghost" size="sm" className="size-8 p-0 rounded-xl" title="Quay lại">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center shrink-0">
              <Headphones className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground truncate">
              Shadowing Studio
            </span>
            {videoTitle && (
              <Badge variant="secondary" className="text-[10px] font-mono hidden md:inline-flex">
                {videoTitle.length > 30 ? videoTitle.slice(0, 30) + "…" : videoTitle}
              </Badge>
            )}
          </div>
        </div>

        {/* Center: URL Input */}
        <div className="flex-1 max-w-md hidden md:flex items-center gap-2 mx-4">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Dán link YouTube bất kỳ..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLoadVideo(youtubeUrl);
              }}
              className="pl-9 pr-8 h-8 rounded-xl text-xs bg-background border-border/80"
            />
            <button
              onClick={handlePasteClipboard}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Dán từ Clipboard"
            >
              <Clipboard className="size-3.5" />
            </button>
          </div>
          <Button
            onClick={() => handleLoadVideo(youtubeUrl)}
            disabled={isLoadingTranscript || !youtubeUrl.trim()}
            size="sm"
            className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 shrink-0"
          >
            {isLoadingTranscript ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {isLoadingTranscript ? "Đang tải..." : "Nạp Video"}
            </span>
          </Button>
        </div>

        {/* Right: Stats + Speed + Clear Video + Library */}
        <div className="flex items-center gap-2 shrink-0">
          {segments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCurrentVideo}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground gap-1"
              title="Đổi video khác"
            >
              <PlusCircle className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Đổi video</span>
            </Button>
          )}

          {avgScore !== null && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60">
              <Activity className="size-3.5 text-primary" />
              <span
                className={
                  avgScore >= 80 ? "text-emerald-500" : avgScore >= 65 ? "text-amber-500" : "text-red-500"
                }
              >
                {avgScore}
              </span>
              <span className="text-muted-foreground">avg ({sessionScores.length})</span>
            </div>
          )}

          {/* Speed Control */}
          <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/60">
            {[0.75, 1.0, 1.25].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg transition-all ${
                  playbackSpeed === spd
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLibrary(!showLibrary)}
            className="h-8 rounded-xl text-xs font-bold gap-1 border-border/80"
            title="Thư viện Video"
          >
            <Library className="size-3.5" />
            <span className="hidden sm:inline">Thư viện ({libraryItems.length})</span>
          </Button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      {segments.length === 0 ? (
        /* Empty State: YouTube Link Input Hero (100% pure real user input) */
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full space-y-6 text-center animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="size-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary mx-auto flex items-center justify-center shadow-lg">
              <Headphones className="size-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Nhập link YouTube để bắt đầu Shadowing
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Hệ thống tải transcript phụ đề bản xứ trực tiếp từ YouTube và ngắt nhịp thở Thought Groups theo cấu trúc ngữ âm tức thì.
              </p>
            </div>

            {/* Input Box */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Dán link YouTube (e.g. https://www.youtube.com/watch?v=...)"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLoadVideo(youtubeUrl);
                  }}
                  className="pl-10 pr-9 h-11 rounded-2xl text-xs sm:text-sm bg-card border-border/80 shadow-xs"
                />
                <button
                  onClick={handlePasteClipboard}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Dán từ Clipboard"
                >
                  <Clipboard className="size-4" />
                </button>
              </div>

              <Button
                onClick={() => handleLoadVideo(youtubeUrl)}
                disabled={isLoadingTranscript || !youtubeUrl.trim()}
                className="h-11 px-5 rounded-2xl text-xs sm:text-sm font-bold gap-2 shrink-0 shadow-md"
              >
                {isLoadingTranscript ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                <span>{isLoadingTranscript ? "Đang tải phụ đề..." : "Nạp Video"}</span>
              </Button>
            </div>

            {/* Alternative: Custom Script Input button */}
            <div className="flex items-center justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomScriptModal(true)}
                className="h-8 px-3.5 rounded-xl text-xs font-semibold gap-1.5 border-border/80 text-muted-foreground hover:text-foreground"
              >
                <FileText className="size-3.5 text-primary" />
                <span>✍️ Dán bài nói thủ công (Custom Script)</span>
              </Button>
            </div>

            {/* Saved Library Items if any */}
            {libraryItems.length > 0 && (
              <div className="pt-6 border-t border-border/60 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Video trong thư viện của bạn ({libraryItems.length}):
                  </span>
                </div>
                <div className="grid gap-2">
                  {libraryItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-all flex items-center justify-between gap-3 group"
                    >
                      <button
                        onClick={() => handleLoadFromLibrary(item)}
                        className="flex items-center gap-3 text-left min-w-0 flex-1"
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-16 aspect-video rounded-xl object-cover bg-black/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {item.channel} • {item.duration} • {item.segmentsCount} câu
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleLoadFromLibrary(item)}
                          className="rounded-xl text-xs font-bold h-8"
                        >
                          Luyện tập
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteFromLibrary(item, e)}
                          className="size-8 p-0 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          title="Xóa video khỏi thư viện"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      ) : (
        /* Active Practice View */
        <main className="flex-1 p-3 sm:p-4 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
          {/* LEFT (6 cols): YouTube Player */}
          <div className="lg:col-span-6 h-full flex flex-col gap-3 overflow-hidden">
            {/* YouTube Player */}
            <div className="rounded-3xl border border-border/80 bg-black overflow-hidden shadow-xs shrink-0">
              <div className="relative aspect-video w-full bg-black">
                {isLoadingTranscript ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                    <Loader2 className="size-8 text-primary animate-spin" />
                    <p className="text-xs text-white/70 font-semibold">Đang tải transcript từ YouTube...</p>
                  </div>
                ) : currentVideoId ? (
                  <iframe
                    ref={iframeRef}
                    src={`https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1&rel=0&modestbranding=1`}
                    title={videoTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="size-12 text-white/20" />
                  </div>
                )}
              </div>
            </div>

            {/* Transcript & Deck Tabs */}
            <div className="flex-1 flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden">
              <div className="flex items-center gap-0.5 px-3 pt-2.5 pb-0 border-b border-border/40 bg-muted/20 shrink-0">
                {[
                  { id: "transcript" as const, label: `Transcript (${segments.length})` },
                  { id: "deck" as const, label: `Deck (${vocabDeck.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    className={`text-xs font-bold px-3 py-2 rounded-t-xl transition-all border-b-2 ${
                      rightTab === tab.id
                        ? "border-primary text-primary bg-card"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Transcript List */}
              {rightTab === "transcript" && (
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {segments.map((seg, idx) => {
                    const segScore = sessionScores[idx];
                    const isActive = idx === activeSegmentIndex;
                    return (
                      <button
                        key={seg.segment_id}
                        onClick={() => goToSegment(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-start gap-2 ${
                          isActive
                            ? "bg-primary/10 border border-primary/30 text-foreground"
                            : "hover:bg-muted/50 text-muted-foreground border border-transparent"
                        }`}
                      >
                        <span
                          className={`font-mono font-bold text-[10px] shrink-0 mt-0.5 ${
                            isActive ? "text-primary" : "text-muted-foreground/60"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className={`flex-1 leading-relaxed ${isActive ? "font-semibold text-foreground" : ""}`}>
                          {seg.text}
                        </span>
                        {segScore !== undefined && (
                          <span
                            className={`font-mono font-extrabold text-[11px] shrink-0 ${
                              segScore >= 85
                                ? "text-emerald-500"
                                : segScore >= 65
                                ? "text-amber-500"
                                : "text-red-500"
                            }`}
                          >
                            {segScore}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Vocab Deck */}
              {rightTab === "deck" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {vocabDeck.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2 py-8">
                      <BookOpen className="size-8 text-muted-foreground/30" />
                      <p>Nhấp vào bất kỳ từ nào trên phụ đề để tra từ điển 10k từ và lưu vào Flashcard</p>
                    </div>
                  ) : (
                    vocabDeck.map((w: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/70 hover:border-primary/40 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => tts.speak(w.word)}
                            className="size-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors"
                            title="Nghe phát âm"
                          >
                            <span className="text-xs">🔊</span>
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-foreground font-mono truncate">{w.word}</p>
                              {w.ipa && <span className="text-[10px] text-muted-foreground font-mono">{w.ipa}</span>}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{w.meaning}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {w.cefrLevel && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {w.cefrLevel}
                            </Badge>
                          )}
                          <button
                            onClick={() => {
                              setVocabDeck((prev) => prev.filter((_, idx) => idx !== i));
                              toast.success("Đã xóa khỏi Flashcard", `"${w.word}"`);
                            }}
                            className="size-7 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                            title="Xóa khỏi Deck"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT (6 cols): Sentence Practice Card */}
          <div className="lg:col-span-6 h-full overflow-hidden">
            {currentSegment && (
              <SentencePracticeCard
                segment={currentSegment}
                segmentIndex={activeSegmentIndex}
                totalSegments={segments.length}
                analysis={analysis}
                subtitleLayer={subtitleLayer}
                onSubtitleLayerChange={setSubtitleLayer}
                status={recordingStatus}
                liveTranscript={speechRec.fullTranscript || speechRec.transcript}
                score={score}
                userAudioUrl={userAudioUrl}
                isLooping={isLooping}
                onToggleLoop={handleToggleLoop}
                onPlayNative={handlePlayNative}
                onStartRecord={handleStartRecord}
                onStopRecord={handleStopRecord}
                onRetry={handleRetry}
                onNext={() => {
                  if (activeSegmentIndex < segments.length - 1) goToSegment(activeSegmentIndex + 1);
                }}
                onPrev={() => {
                  if (activeSegmentIndex > 0) goToSegment(activeSegmentIndex - 1);
                }}
                onSaveWordToDeck={handleSaveWordToDeck}
              />
            )}
          </div>
        </main>
      )}

      {/* ── LIBRARY MODAL DRAWER ── */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Library className="size-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Thư viện Video Shadowing</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLibrary(false)}
                className="rounded-full size-8 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {libraryItems.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
                  <Library className="size-8 text-muted-foreground/30 mx-auto" />
                  <p>Chưa có video nào trong thư viện.</p>
                  <p className="text-[11px]">Dán một link YouTube để tải và tự động lưu vào đây.</p>
                </div>
              ) : (
                libraryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-muted/30 border border-border/60 hover:border-primary/40 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-20 aspect-video rounded-xl object-cover bg-black/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {item.channel} • {item.duration} • {item.segmentsCount} câu
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleLoadFromLibrary(item)}
                        className="rounded-xl text-xs font-bold h-8"
                      >
                        Luyện tập
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteFromLibrary(item, e)}
                        className="size-8 p-0 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        title="Xóa video khỏi thư viện"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM SCRIPT MODAL DRAWER ── */}
      {showCustomScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl max-w-xl w-full flex flex-col overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <div>
                  <h3 className="font-bold text-base text-foreground">Dán bài nói thủ công (Custom Script)</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Dành cho video không có CC trên YouTube hoặc bài nói tiếng Anh bạn tự chuẩn bị
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomScriptModal(false)}
                className="rounded-full size-8 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                value={customScriptText}
                onChange={(e) => setCustomScriptText(e.target.value)}
                placeholder="Dán toàn bộ đoạn văn tiếng Anh vào đây. Hệ thống sẽ tự động ngắt câu, đo lường thời gian và phân tích ngữ điệu tức thì..."
                rows={7}
                className="w-full p-3 rounded-2xl bg-background border border-border/80 text-xs sm:text-sm font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-primary resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-muted-foreground">
                  {customScriptText.trim().split(/\s+/).filter(Boolean).length} từ •{" "}
                  {
                    customScriptText
                      .split(/(?<=[.?!])\s+|\n+/)
                      .map((s) => s.trim())
                      .filter((s) => s.length > 2).length
                  }{" "}
                  câu
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustomScriptModal(false)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLoadCustomScript}
                    disabled={!customScriptText.trim() || isLoadingTranscript}
                    className="rounded-xl text-xs font-bold gap-1.5"
                  >
                    {isLoadingTranscript ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    <span>Bắt đầu Shadowing</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
