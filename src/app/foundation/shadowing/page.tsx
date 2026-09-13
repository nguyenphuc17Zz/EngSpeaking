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
import { transcribeViaServer } from "@/lib/stt/service";
import { useSettingsStore } from "@/stores/settings-store";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { WordLookupPopup } from "@/components/foundation/shadowing/WordLookupPopup";
import {
  computeShadowingScore,
  type ShadowingScoreResult,
} from "@/lib/foundation/shadowing/pronunciation-scorer";
import {
  CORODOMO_VIDEO_PRESETS,
  type CorodomoVideoLesson,
  type CorodomoSegment,
  extractYouTubeVideoId,
} from "@/lib/foundation/shadowing/corodomo-presets";
import {
  getSentenceWordsWithIpa,
  type WordIpaToken,
} from "@/lib/foundation/shadowing/ipa-dictionary";
import {
  getVideoLibrary,
  addVideoToLibrary,
  updateVideoInLibrary,
  deleteVideoFromLibrary,
  resetVideoLibraryToDefaults,
  type SavedVideoLesson,
} from "@/lib/foundation/shadowing/shadowing-library.service";
import { lookupLexiconWord } from "@/lib/foundation/vocabulary/lexicon-db.service";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import {
  ArrowLeft,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  PlusCircle,
  X,
  Loader2,
  CheckCircle2,
  Volume2,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Type,
  Languages,
  Mic,
  MicOff,
  Repeat,
  Keyboard,
  Video,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  Clock,
  Award,
  Layers,
  Film,
  Library,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type MainView = "hub" | "studio";
type StudioMode = "shadowing" | "pronounce";

function YouTubeIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function CorodomoShadowingStudioPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const tts = useBrowserTTS();
  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  // ─── Top-Level View State: "hub" (Màn chính) | "studio" (Phòng học) ─
  const [currentView, setCurrentView] = useState<MainView>("hub");
  const [activeMode, setActiveMode] = useState<StudioMode>("shadowing");

  // ─── Lesson & Practice State ─────────────────────────────────────────
  const [activeLesson, setActiveLesson] = useState<CorodomoVideoLesson>(CORODOMO_VIDEO_PRESETS[0]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const activeSegmentIndexRef = useRef(0);
  activeSegmentIndexRef.current = activeSegmentIndex;

  // ─── Playback & Sync State ───────────────────────────────────────────
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<"md" | "lg" | "xl">("lg");

  // ─── Subtitle Toggles ([Phụ đề] & [Bản dịch]) ────────────────────────
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  // ─── Recording & Scoring State (Phát âm mode) ────────────────────────
  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "listening" | "recording" | "evaluating"
  >("idle");
  const [score, setScore] = useState<ShadowingScoreResult | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [sentenceScores, setSentenceScores] = useState<Record<string, ShadowingScoreResult>>({});
  const [recordingStartMs, setRecordingStartMs] = useState(0);

  // ─── UI & Input State ────────────────────────────────────────────────
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [modalUrlInput, setModalUrlInput] = useState("");
  const youtubeInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoadingCustomUrl, setIsLoadingCustomUrl] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showSubtitleAccordion, setShowSubtitleAccordion] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ─── Duplicate Link Detection State ─────────────────────────────────
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    isOpen: boolean;
    lesson: CorodomoVideoLesson;
    url: string;
  } | null>(null);

  // ─── Word Lookup Popup State ─────────────────────────────────────────
  const [popupWord, setPopupWord] = useState<any | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null);
  const [vocabDeck, setVocabDeck] = useState<any[]>([]);

  // ─── Refs ────────────────────────────────────────────────────────────
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineItemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const autoPauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserInteractingTimeline = useRef(false);

  // ─── Video Library (CRUD) State ──────────────────────────────────────
  const [videoLibrary, setVideoLibrary] = useState<SavedVideoLesson[]>([]);
  const [librarySearch, setLibrarySearch] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<SavedVideoLesson | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editChannel, setEditChannel] = useState("");

  // ─── Load Video Library on Mount ─────────────────────────────────────
  useEffect(() => {
    setVideoLibrary(getVideoLibrary());
  }, []);

  const handleOpenEditModal = (lesson: SavedVideoLesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditChannel(lesson.channel);
  };

  const handleSaveEdit = () => {
    if (!editingLesson) return;
    const updated = updateVideoInLibrary(editingLesson.id, {
      title: editTitle.trim() || editingLesson.title,
      channel: editChannel.trim() || editingLesson.channel,
    });
    setVideoLibrary(updated);
    if (activeLesson.id === editingLesson.id) {
      setActiveLesson((prev) => ({
        ...prev,
        title: editTitle.trim() || prev.title,
        channel: editChannel.trim() || prev.channel,
      }));
    }
    setEditingLesson(null);
    toast.success("Đã cập nhật bài học!");
  };

  const handleDeleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteVideoFromLibrary(id);
    setVideoLibrary(updated);
    toast.info("Đã xóa bài học khỏi thư viện");
  };

  const handleResetDefaults = () => {
    const defaults = resetVideoLibraryToDefaults();
    setVideoLibrary(defaults);
    toast.success("Đã khôi phục các bài học mặc định!");
  };

  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return videoLibrary;
    return videoLibrary.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.channel.toLowerCase().includes(q)
      );
    });
  }, [videoLibrary, librarySearch]);

  const currentSegment: CorodomoSegment =
    activeLesson.segments[activeSegmentIndex] || activeLesson.segments[0];

  // Tokenize current sentence with IPA above every word
  const currentSentenceTokens: WordIpaToken[] = useMemo(() => {
    if (!currentSegment?.text) return [];
    return getSentenceWordsWithIpa(currentSegment.text);
  }, [currentSegment?.text]);

  // ─── Load YouTube IFrame API ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // ─── Initialize / Update YouTube Player Instance ─────────────────────
  const initYouTubePlayer = useCallback(
    (videoId: string) => {
      if (typeof window === "undefined" || currentView !== "studio") return;

      const createPlayer = () => {
        // If player already exists and is healthy, just load the video directly
        if (
          playerRef.current &&
          typeof playerRef.current.loadVideoById === "function" &&
          document.getElementById("corodomo-yt-player")
        ) {
          try {
            playerRef.current.loadVideoById(videoId);
            playerRef.current.setPlaybackRate(playbackSpeed);
            return;
          } catch {
            // If loadVideoById fails, fallback to recreating
          }
        }

        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {}
          playerRef.current = null;
        }

        const container = playerContainerRef.current;
        if (!container || !window.YT || !window.YT.Player) return;

        // Ensure mount element exists inside the persistent container
        let el = container.querySelector("#corodomo-yt-player") as HTMLElement | null;
        if (!el) {
          el = document.createElement("div");
          el.id = "corodomo-yt-player";
          el.className = "w-full h-full absolute inset-0";
          container.appendChild(el);
        }

        playerRef.current = new window.YT.Player(el, {
          videoId,
          playerVars: {
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            playsinline: 1,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          },
          events: {
            onReady: () => {
              playerRef.current?.setPlaybackRate(playbackSpeed);
            },
            onStateChange: (event: any) => {
              if (event.data === 1) setIsPlayingVideo(true);
              else if (event.data === 2 || event.data === 0) setIsPlayingVideo(false);
            },
          },
        });
      };

      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        window.onYouTubeIframeAPIReady = createPlayer;
      }
    },
    [playbackSpeed, currentView]
  );

  useEffect(() => {
    if (currentView === "studio" && activeLesson?.youtubeId) {
      initYouTubePlayer(activeLesson.youtubeId);
    }
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [currentView, activeLesson?.youtubeId, initYouTubePlayer]);

  // ─── Real-Time Sentence Synchronization Tracking (Hysteresis Engine) ───
  useEffect(() => {
    if (currentView !== "studio") return;

    let animId: number;
    let lastTimeCheck = 0;

    const syncLoop = () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const now = performance.now();
        if (now - lastTimeCheck > 120) {
          lastTimeCheck = now;
          try {
            const time = playerRef.current.getCurrentTime();
            if (typeof time === "number" && !isNaN(time)) {
              setCurrentTime(time);

              const segments = activeLesson.segments;
              if (segments.length > 0) {
                const curIdx = activeSegmentIndexRef.current;
                const currentSeg = segments[curIdx];
                let matchedIdx = -1;

                // 1. Fast Path: Check if playback is within the active sentence (+ 350ms hysteresis)
                if (
                  currentSeg &&
                  time >= currentSeg.start_time - 0.15 &&
                  time <= currentSeg.end_time + 0.35
                ) {
                  matchedIdx = curIdx;
                } else {
                  // 2. Monotonic Lookahead: Next segment
                  const nextSeg = segments[curIdx + 1];
                  if (
                    nextSeg &&
                    time >= nextSeg.start_time - 0.15 &&
                    time <= nextSeg.end_time + 0.35
                  ) {
                    matchedIdx = curIdx + 1;
                  } else {
                    // 3. Fallback scan with tight tolerance
                    matchedIdx = segments.findIndex(
                      (seg) => time >= seg.start_time - 0.15 && time < seg.end_time + 0.25
                    );

                    // 4. Natural Pause Bridge: If between two sentences, stay attached without flickering
                    if (matchedIdx === -1) {
                      for (let s = 0; s < segments.length; s++) {
                        const seg = segments[s];
                        const next = segments[s + 1];
                        if (time >= seg.end_time && next && time < next.start_time) {
                          matchedIdx = time >= next.start_time - 0.15 ? s + 1 : s;
                          break;
                        }
                      }
                    }
                  }
                }

                if (matchedIdx !== -1 && matchedIdx !== activeSegmentIndexRef.current) {
                  activeSegmentIndexRef.current = matchedIdx;
                  setActiveSegmentIndex(matchedIdx);
                }
              }
            }
          } catch {}
        }
      }
      animId = requestAnimationFrame(syncLoop);
    };

    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, [currentView, activeLesson.segments]);

  // ─── Auto-Scroll Timeline Row into View as Video Plays ───────────────
  useEffect(() => {
    if (currentView !== "studio") return;
    const el = timelineItemRefs.current[activeSegmentIndex];
    if (el && !isUserInteractingTimeline.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSegmentIndex, currentView]);

  // ─── Live Session Timer ──────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);


  // ─── Player Controls ─────────────────────────────────────────────────
  const playVideo = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === "function") {
      playerRef.current.playVideo();
    }
    setIsPlayingVideo(true);
  }, []);

  const pauseVideo = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
      playerRef.current.pauseVideo();
    }
    setIsPlayingVideo(false);
  }, []);

  const seekToSegment = useCallback(
    (index: number, autoPlay = true) => {
      if (!activeLesson.segments[index]) return;
      if (autoPauseTimerRef.current) clearTimeout(autoPauseTimerRef.current);

      setActiveSegmentIndex(index);
      activeSegmentIndexRef.current = index;
      setScore(null);
      setUserAudioUrl(null);
      speechRec.resetTranscript();

      const seg = activeLesson.segments[index];
      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(seg.start_time, true);
        if (autoPlay) {
          playerRef.current.playVideo();
          setIsPlayingVideo(true);

          if (autoPauseEnabled) {
            const durationSec = Math.max(1, seg.end_time - seg.start_time);
            const durationMs = (durationSec / playbackSpeed) * 1000;
            autoPauseTimerRef.current = setTimeout(() => {
              pauseVideo();
              if (isLooping) {
                seekToSegment(index, true);
              }
            }, durationMs + 150);
          }
        }
      }

    },
    [activeLesson.segments, playbackSpeed, autoPauseEnabled, isLooping, pauseVideo, speechRec]
  );

  const handlePlayNative = useCallback(() => {
    seekToSegment(activeSegmentIndex, true);
  }, [activeSegmentIndex, seekToSegment]);

  const handlePrevSegment = useCallback(() => {
    if (activeSegmentIndex > 0) {
      seekToSegment(activeSegmentIndex - 1, true);
    }
  }, [activeSegmentIndex, seekToSegment]);

  const handleNextSegment = useCallback(() => {
    if (activeSegmentIndex < activeLesson.segments.length - 1) {
      seekToSegment(activeSegmentIndex + 1, true);
    } else {
      setShowCompletedModal(true);
    }
  }, [activeSegmentIndex, activeLesson.segments.length, seekToSegment]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === "function") {
      playerRef.current.setPlaybackRate(speed);
    }
    toast.info(`Tốc độ phát: ${speed}x`);
  };

  // ─── Recording & Scoring (Chế độ Luyện Phát Âm) ───────────────────────
  const handleStartRecord = useCallback(async () => {
    pauseVideo();
    soundEffects.playMicStart();
    speechRec.resetTranscript();
    setRecordingStartMs(Date.now());
    setRecordingStatus("recording");

    const sttProvider = settings.stt?.provider || "browser";
    try {
      await recorder.start();
      if (sttProvider === "browser") {
        speechRec.startListening();
      }
    } catch {
      toast.error("Lỗi Microphone", "Vui lòng cho phép quyền truy cập micro.");
      setRecordingStatus("idle");
    }
  }, [pauseVideo, recorder, speechRec, settings.stt?.provider]);

  const handleStopRecord = useCallback(async () => {
    soundEffects.playMicStop();
    const sttProvider = settings.stt?.provider || "browser";
    if (sttProvider === "browser") {
      speechRec.stopListening();
    }
    setRecordingStatus("evaluating");

    try {
      const recording = await recorder.stop();
      let spokenText = "";

      if (sttProvider !== "browser" && recording?.blob) {
        try {
          const res = await transcribeViaServer(recording.blob, {
            provider: sttProvider === "auto" ? "whisper-local" : sttProvider,
            model: settings.stt?.model || "auto",
            language: "en-US",
          });
          spokenText = res.text.trim();
        } catch {
          spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
        }
      } else {
        await new Promise((r) => setTimeout(r, 250));
        spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
      }

      if (!spokenText) {
        toast.info("Chưa nghe rõ giọng nói", "Vui lòng nói to và rõ ràng hơn.");
        setRecordingStatus("idle");
        return;
      }

      const durationMs = recording?.durationMs || Math.max(1000, Date.now() - recordingStartMs);
      const expectedDurMs = (currentSegment.end_time - currentSegment.start_time) * 1000;

      const evalResult = computeShadowingScore(
        currentSegment.text,
        spokenText,
        durationMs,
        expectedDurMs
      );

      setScore(evalResult);
      const updatedScores = {
        ...sentenceScores,
        [currentSegment.segment_id]: evalResult,
      };
      setSentenceScores(updatedScores);

      if (recording?.blob) {
        const audioUrl = URL.createObjectURL(recording.blob);
        setUserAudioUrl(audioUrl);
      }

      if (evalResult.overall >= 85) {
        soundEffects.playSuccessFanfare();
        triggerConfetti();
      } else {
        soundEffects.playAIReady();
      }
    } catch {
      toast.error("Lỗi chấm điểm", "Không thể hoàn tất đánh giá phát âm.");
    } finally {
      setRecordingStatus("idle");
    }
  }, [
    recorder,
    speechRec,
    settings.stt?.provider,
    settings.stt?.model,
    recordingStartMs,
    currentSegment,
    sentenceScores,
  ]);

  // ─── Keyboard Hotkeys (Space to Record/Play, Enter to Check/Next) ─────
  useEffect(() => {
    if (currentView !== "studio") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (activeMode === "pronounce") {
          if (recordingStatus === "recording") {
            handleStopRecord();
          } else if (recordingStatus === "idle") {
            handlePlayNative();
          }
        } else {
          if (isPlayingVideo) pauseVideo();
          else playVideo();
        }
      } else if (e.code === "Enter") {
        e.preventDefault();
        if (activeMode === "pronounce") {
          if (recordingStatus === "idle") {
            handleStartRecord();
          } else if (recordingStatus === "recording") {
            handleStopRecord();
          }
        }
      } else if (e.code === "KeyR" && score) {
        e.preventDefault();
        handlePlayNative();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevSegment();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextSegment();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentView,
    activeMode,
    recordingStatus,
    isPlayingVideo,
    score,
    handleStartRecord,
    handleStopRecord,
    handlePlayNative,
    playVideo,
    pauseVideo,
    handlePrevSegment,
    handleNextSegment,
  ]);

  // ─── Word Lookup Handler ─────────────────────────────────────────────
  const handleWordClick = (word: string, e?: React.MouseEvent<HTMLElement>) => {
    const clean = word.toLowerCase().replace(/[^\w']/g, "");
    if (!clean) return;

    const lexiconMatch = lookupLexiconWord(clean);
    let popupData: any;

    if (lexiconMatch) {
      popupData = {
        word: lexiconMatch.word,
        ipa: lexiconMatch.ipaUS || lexiconMatch.ipaUK || "",
        meaning: lexiconMatch.meaningVi,
        partOfSpeech: lexiconMatch.partOfSpeech,
        contextSentence: currentSegment.text,
        cefrLevel: lexiconMatch.cefrLevel,
      };
    } else {
      popupData = {
        word: clean,
        ipa: "",
        meaning: "Từ vựng trong câu thoại video",
        partOfSpeech: "word",
        contextSentence: currentSegment.text,
        cefrLevel: "B1",
      };
    }

    setPopupWord(popupData);
    if (e?.currentTarget) {
      setPopupAnchor(e.currentTarget);
    } else {
      setPopupAnchor(document.body);
    }
  };

  const handleSaveWordToDeck = (word: any) => {
    setVocabDeck((prev) => {
      if (prev.some((w) => w.word.toLowerCase() === word.word.toLowerCase())) return prev;
      return [word, ...prev];
    });
    toast.success(`Đã lưu "${word.word}" vào sổ từ vựng!`);
  };

  // ─── Load Custom YouTube URL Handler ─────────────────────────────────
  const handleLoadCustomYouTubeUrl = async (customUrl?: string, forceReload = false) => {
    const urlToLoad = customUrl || customUrlInput;
    const videoId = extractYouTubeVideoId(urlToLoad);

    if (!videoId) {
      toast.error("Link YouTube không hợp lệ", "Vui lòng nhập đường dẫn hoặc ID video YouTube 11 ký tự.");
      return;
    }

    // Check for duplicate in library or presets if not forced
    if (!forceReload) {
      const existingLesson =
        videoLibrary.find((v) => v.youtubeId === videoId) ||
        CORODOMO_VIDEO_PRESETS.find((p) => p.youtubeId === videoId);

      if (existingLesson && existingLesson.segments && existingLesson.segments.length > 0) {
        setDuplicatePrompt({
          isOpen: true,
          lesson: existingLesson,
          url: urlToLoad,
        });
        return;
      }
    }

    setIsLoadingCustomUrl(true);
    toast.info("Đang tải phụ đề YouTube...", "Vui lòng chờ trong giây lát.");

    try {
      const res = await fetch("/api/shadowing/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToLoad }),
      });

      const data = await res.json();
      if (!res.ok || !data.segments || data.segments.length === 0) {
        throw new Error(data.error || "Không tìm thấy phụ đề cho video này.");
      }

      const loadedLesson: CorodomoVideoLesson = {
        id: `custom_${videoId}`,
        youtubeId: videoId,
        title: data.title || `YouTube Video (${videoId})`,
        channel: data.channel || "YouTube",
        cefrLevel: "Custom",
        playlistName: "Video Tự Chọn",
        playlistId: `custom_pl_${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: "10:00",
        segments: data.segments.map((s: any, idx: number) => ({
          segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
          text: s.text,
          start_time: s.start_time,
          end_time: s.end_time,
          translationVi: s.translationVi || "",
          thoughtGroups: s.text,
          ipa: s.ipa || "",
          wordsWithIpa: s.wordsWithIpa,
        })),
      };

      setActiveLesson(loadedLesson);
      setActiveSegmentIndex(0);
      setScore(null);
      setUserAudioUrl(null);
      setSentenceScores({});
      setCustomUrlInput("");
      setModalUrlInput("");
      setShowAddVideoModal(false);

      // Save to video library (Create)
      const updatedLib = addVideoToLibrary(loadedLesson);
      setVideoLibrary(updatedLib);
      setCurrentView("studio");

      toast.success("Nạp video thành công!", `Đã lưu vào thư viện với ${loadedLesson.segments.length} câu phụ đề.`);
    } catch (err: unknown) {
      toast.error("Không thể lấy phụ đề", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingCustomUrl(false);
    }
  };

  const handleSelectLesson = (lesson: CorodomoVideoLesson, startIdx = 0) => {
    setActiveLesson(lesson);
    setActiveSegmentIndex(startIdx);
    setScore(null);
    setUserAudioUrl(null);
    setSentenceScores({});

    // Enter Studio View
    setCurrentView("studio");
    toast.success("Đã mở bài học!", lesson.title);
  };

  // ─── Paste from Clipboard Helper ────────────────────────────────────
  const handlePasteClipboard = async (isModal = false) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (isModal) {
          setModalUrlInput(text.trim());
        } else {
          setCustomUrlInput(text.trim());
        }
        toast.info("Đã dán liên kết từ Clipboard!");
      }
    } catch {
      toast.info("Vui lòng dán trực tiếp vào ô nhập.");
    }
  };

  // ─── Filtered Segments for Sidebar ───────────────────────────────────
  const filteredSegments = useMemo(() => {
    if (!transcriptSearch.trim()) return activeLesson.segments;
    const q = transcriptSearch.toLowerCase();
    return activeLesson.segments.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        (s.translationVi && s.translationVi.toLowerCase().includes(q))
    );
  }, [activeLesson.segments, transcriptSearch]);

  const completedCount = Object.keys(sentenceScores).length;
  const progressPercent = Math.round((completedCount / (activeLesson.segments.length || 1)) * 100);

  // Download transcript as text
  const handleDownloadTranscript = () => {
    const textContent = activeLesson.segments
      .map((s, i) => `${i + 1}. [${s.start_time}s - ${s.end_time}s]\n${s.text}\n${s.translationVi || ""}\n`)
      .join("\n");
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeLesson.title.replace(/[^\w\s]/gi, "")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải xuống file phụ đề!");
  };

  const handleCopyTranscript = () => {
    const textContent = activeLesson.segments.map((s) => s.text).join("\n");
    navigator.clipboard.writeText(textContent);
    toast.success("Đã sao chép toàn bộ lời thoại vào Clipboard!");
  };

  // ─── Mode 1: Subtitle Pill & Video Controls Bar (Shadowing Left) ─────
  const renderShadowingLeftControls = () => (
    <>
      {/* Subtitle Pill & Translation Area (Placed Below Video, matching Corodomo) */}
      <div className="flex-1 min-h-[90px] flex flex-col items-center justify-center px-4 py-2 text-center select-text">
        {showSubtitle && (
          <div className="inline-flex flex-wrap items-end justify-center gap-x-2 gap-y-1 bg-[#1e2329] dark:bg-[#181d24] text-white px-5 py-2.5 rounded-2xl border border-white/10 shadow-md">
            {currentSentenceTokens.map((token, i) => (
              <div
                key={i}
                onClick={(e) => handleWordClick(token.cleanWord, e)}
                className="inline-flex flex-col items-center cursor-pointer group px-1 py-0.5 rounded transition-all hover:bg-white/10"
                title={`Click để tra từ: "${token.cleanWord}"`}
              >
                <span className="text-[10px] sm:text-[11px] font-mono text-amber-300 font-semibold leading-none mb-0.5 select-none tracking-tight">
                  {token.ipa || "—"}
                </span>
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-amber-200 transition-colors leading-tight">
                  {token.word}
                </span>
              </div>
            ))}
          </div>
        )}

        {showTranslation && currentSegment.translationVi && (
          <p className="text-xs sm:text-sm text-foreground font-bold leading-normal mt-2 max-w-2xl">
            {currentSegment.translationVi}
          </p>
        )}
      </div>

      {/* Video Controls Bar below Video */}
      <div className="shrink-0 px-3.5 py-2 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-2 shadow-2xs">
        {/* Left: Toggles for [Phụ đề] & [Bản dịch] */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubtitle(!showSubtitle)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              showSubtitle
                ? "bg-primary/10 text-primary border border-primary/40"
                : "bg-muted/40 text-muted-foreground border border-border/60"
            )}
          >
            <Check className={cn("size-3", showSubtitle ? "opacity-100" : "opacity-0")} />
            <span>Phụ đề</span>
          </button>

          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              showTranslation
                ? "bg-primary/10 text-primary border border-primary/40"
                : "bg-muted/40 text-muted-foreground border border-border/60"
            )}
          >
            <Check className={cn("size-3", showTranslation ? "opacity-100" : "opacity-0")} />
            <span>Bản dịch</span>
          </button>
        </div>

        {/* Center: Sentence Navigation & Loop */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevSegment}
            disabled={activeSegmentIndex === 0}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Câu trước"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="text-xs font-mono font-bold text-foreground px-1.5">
            {activeSegmentIndex + 1} / {activeLesson.segments.length}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSegment}
            disabled={activeSegmentIndex === activeLesson.segments.length - 1}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Câu sau"
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            variant={isLooping ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLooping(!isLooping)}
            className={cn(
              "size-7 p-0 rounded-lg transition-all",
              isLooping
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground border-border/60 hover:text-foreground"
            )}
            title="Lặp lại câu này"
          >
            <Repeat className="size-3.5" />
          </Button>
        </div>

        {/* Right: Speed & Back to Hub */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border/60">
            {[0.75, 0.9, 1.0, 1.25].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={cn(
                  "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-all",
                  playbackSpeed === s
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}x
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView("hub")}
            className="h-7 px-2.5 rounded-lg text-xs font-bold gap-1 text-primary border-primary/40 hover:bg-primary/10"
          >
            <Film className="size-3" />
            <span className="hidden md:inline">Đổi video</span>
          </Button>
        </div>
      </div>
    </>
  );

  // ─── Mode 1: Synchronized Subtitle Sidebar (Shadowing Right) ────────
  const renderShadowingSidebar = () => (
    <div className="h-full flex flex-col rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs min-h-0">
      {/* Header: "Phụ đề" + Download + Copy */}
      <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-sm text-foreground">Phụ đề</h3>
          <Badge variant="outline" className="text-[10px] font-mono h-5 text-muted-foreground">
            {activeLesson.segments.length} câu
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadTranscript}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Tải phụ đề về máy"
          >
            <Download className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyTranscript}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Sao chép toàn bộ lời thoại"
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={transcriptSearch}
            onChange={(e) => setTranscriptSearch(e.target.value)}
            placeholder="Tìm kiếm câu thoại hoặc nghĩa tiếng Việt..."
            className="h-8 pl-8 text-xs bg-muted/20 rounded-xl"
          />
        </div>
      </div>

      {/* Scrollable Sentence List with Real-time Auto-Scroll Highlight */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2"
        onMouseEnter={() => (isUserInteractingTimeline.current = true)}
        onMouseLeave={() => (isUserInteractingTimeline.current = false)}
      >
        {filteredSegments.map((seg) => {
          const originalIndex = activeLesson.segments.findIndex(
            (s) => s.segment_id === seg.segment_id
          );
          const isActive = originalIndex === activeSegmentIndex;

          return (
            <div
              key={seg.segment_id}
              ref={(el) => {
                timelineItemRefs.current[originalIndex] = el;
              }}
              onClick={() => seekToSegment(originalIndex, true)}
              className={cn(
                "p-3 rounded-2xl border transition-all cursor-pointer select-text flex items-start gap-2.5",
                isActive
                  ? "bg-primary/10 border-primary/50 shadow-xs ring-1 ring-primary/30"
                  : "bg-card hover:bg-muted/30 border-border/60"
              )}
            >
              <button
                className={cn(
                  "size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isActive && isPlayingVideo ? (
                  <Pause className="size-3 fill-current" />
                ) : (
                  <Play className="size-3 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs sm:text-sm leading-snug",
                    isActive ? "font-bold text-foreground" : "text-foreground/90 font-medium"
                  )}
                >
                  {seg.text}
                </p>

                {seg.translationVi && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-normal">
                    {seg.translationVi}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Mode 2: Toolbar, Progress & Subtitle Accordion (Pronounce Left) ─
  const renderPronounceLeftControls = () => (
    <>
      {/* Toolbar */}
      <div className="shrink-0 px-3 py-1.5 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVideoHidden(!isVideoHidden)}
            className="h-7 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
          >
            <Video className="size-3" />
            <span>{isVideoHidden ? "Hiện video" : "Ẩn video"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast.info(
                "Phím tắt bàn phím",
                "Space: Phát lại • Enter: Kiểm tra phát âm • Mũi tên: Chuyển câu"
              )
            }
            className="h-7 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
          >
            <Keyboard className="size-3" />
            <span>Phím tắt</span>
          </Button>
        </div>

        <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border/60">
          {[0.75, 1.0, 1.25].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={cn(
                "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-all",
                playbackSpeed === s
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="shrink-0 px-3.5 py-2.5 rounded-2xl bg-card border border-border/70 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground">
            Đã hoàn thành {completedCount}/{activeLesson.segments.length}
          </span>
          <span className="text-primary font-mono">
            {progressPercent}%
          </span>
        </div>
        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Subtitle Accordion */}
      <div className="flex-1 min-h-0 rounded-2xl border border-border/70 bg-card overflow-hidden flex flex-col shadow-2xs">
        <div
          onClick={() => setShowSubtitleAccordion(!showSubtitleAccordion)}
          className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between cursor-pointer"
        >
          <span className="text-xs font-bold text-foreground">
            Phụ đề [{activeSegmentIndex + 1}/{activeLesson.segments.length}]
          </span>
          {showSubtitleAccordion ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>

        {showSubtitleAccordion && (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {activeLesson.segments.map((seg, idx) => {
              const isCur = idx === activeSegmentIndex;
              return (
                <div
                  key={seg.segment_id}
                  onClick={() => seekToSegment(idx, true)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer text-left",
                    isCur
                      ? "bg-primary/10 border-primary/40 shadow-2xs"
                      : "hover:bg-muted/20 border-border/40"
                  )}
                >
                  <span className="text-[10px] font-mono font-bold text-muted-foreground block mb-0.5">
                    CÂU {idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {seg.text}
                  </p>
                  {seg.translationVi && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                      {seg.translationVi}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // ─── Mode 2: Pronunciation & Scoring Panel (Pronounce Right) ─────────
  const renderPronouncePanel = () => (
    <div className="h-full flex flex-col rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs min-h-0">
      <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
        <h3 className="font-extrabold text-sm text-foreground">Luyện phát âm</h3>
        <Badge variant="outline" className="text-xs font-mono font-bold h-6">
          {activeSegmentIndex + 1}/{activeLesson.segments.length}
        </Badge>
      </div>

      {/* Sentence Pagination */}
      <div className="px-4 py-2.5 border-b border-border/50 shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevSegment}
            disabled={activeSegmentIndex === 0}
            className="size-7 p-0 rounded-lg"
          >
            <ChevronLeft className="size-3.5" />
          </Button>

          {Array.from({ length: Math.min(10, activeLesson.segments.length) }, (_, i) => {
            const startOffset = Math.max(
              0,
              Math.min(activeSegmentIndex - 4, activeLesson.segments.length - 10)
            );
            const sentenceNum = startOffset + i + 1;
            const isCur = sentenceNum - 1 === activeSegmentIndex;

            return (
              <button
                key={sentenceNum}
                onClick={() => seekToSegment(sentenceNum - 1, true)}
                className={cn(
                  "size-7 rounded-full text-xs font-mono font-bold transition-all flex items-center justify-center",
                  isCur
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {sentenceNum}
              </button>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSegment}
            disabled={activeSegmentIndex === activeLesson.segments.length - 1}
            className="size-7 p-0 rounded-lg"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
          <span>Số câu/lượt:</span>
          <span className="font-bold text-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
            1
          </span>
        </div>
      </div>

      {/* CÂU HIỆN TẠI */}
      <div className="p-4 border-b border-border/60 bg-muted/10 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            CÂU HIỆN TẠI
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tts.speak(currentSegment.text)}
              className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Nghe Audio mẫu"
            >
              <Volume2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSubtitle(!showSubtitle)}
              className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Ẩn/Hiện chữ"
            >
              {showSubtitle ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFontSizeLevel(
                  fontSizeLevel === "md" ? "lg" : fontSizeLevel === "lg" ? "xl" : "md"
                );
              }}
              className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Cỡ chữ"
            >
              <Type className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslation(!showTranslation)}
              className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Ẩn/Hiện dịch nghĩa"
            >
              <Languages className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Target Sentence Display with Stacked IPA */}
        <div className="min-h-[56px] flex flex-col justify-center">
          {showSubtitle ? (
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
              {currentSentenceTokens.map((token, i) => (
                <div
                  key={i}
                  onClick={(e) => handleWordClick(token.cleanWord, e)}
                  className="inline-flex flex-col items-center cursor-pointer group px-0.5 rounded transition-all hover:bg-muted/40"
                >
                  <span className="text-[10px] font-mono text-primary font-semibold leading-none mb-0.5 select-none">
                    {token.ipa || "—"}
                  </span>
                  <span
                    className={cn(
                      "font-extrabold text-foreground group-hover:text-primary transition-colors leading-tight",
                      fontSizeLevel === "md"
                        ? "text-base"
                        : fontSizeLevel === "lg"
                        ? "text-lg"
                        : "text-xl"
                    )}
                  >
                    {token.word}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground py-2 italic text-xs">
              <EyeOff className="size-4" />
              <span>Nội dung đã ẩn để bạn tập trung luyện nghe</span>
            </div>
          )}

          {showTranslation && currentSegment.translationVi && (
            <p className="text-xs text-muted-foreground font-medium italic mt-2">
              {currentSegment.translationVi}
            </p>
          )}
        </div>
      </div>

      {/* Big Action Buttons */}
      <div className="p-4 border-b border-border/50 shrink-0 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePlayNative}
          className="h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm border-border/80 flex-1 flex items-center justify-center gap-1.5 hover:bg-muted/50"
        >
          <Play className="size-4 fill-current text-muted-foreground" />
          <span>Phát lại</span>
          <kbd className="text-[9px] font-mono px-1 py-0.5 bg-muted rounded text-muted-foreground ml-1">
            space
          </kbd>
        </Button>

        <Button
          size="lg"
          onClick={recordingStatus === "recording" ? handleStopRecord : handleStartRecord}
          disabled={recordingStatus === "evaluating"}
          className={cn(
            "h-11 px-6 rounded-2xl font-black text-xs sm:text-sm flex-2 flex items-center justify-center gap-2 text-white shadow-md transition-all",
            recordingStatus === "recording"
              ? "bg-rose-500 hover:bg-rose-600 animate-pulse ring-4 ring-rose-500/25"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
        >
          {recordingStatus === "evaluating" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Đang chấm...</span>
            </>
          ) : recordingStatus === "recording" ? (
            <>
              <MicOff className="size-4" />
              <span>Dừng & Chấm điểm</span>
            </>
          ) : (
            <>
              <Mic className="size-4" />
              <span>Kiểm tra phát âm</span>
              <kbd className="text-[9px] font-mono px-1 py-0.5 bg-white/20 rounded ml-1">
                enter
              </kbd>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={handleNextSegment}
          disabled={activeSegmentIndex === activeLesson.segments.length - 1}
          className="h-11 px-4 rounded-2xl font-bold text-xs sm:text-sm border-border/80 flex-1 flex items-center justify-center gap-1 hover:bg-muted/50"
        >
          <span>Tiếp</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* 4 Score Metric Cards */}
      <div className="flex-1 min-h-0 p-4 grid grid-cols-2 gap-3 overflow-y-auto">
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground">Điểm phát âm</span>
          <span
            className={cn(
              "text-2xl sm:text-3xl font-black font-mono mt-1",
              score?.overall
                ? score.overall >= 80
                  ? "text-emerald-500"
                  : score.overall >= 60
                  ? "text-amber-500"
                  : "text-rose-500"
                : "text-rose-500/80"
            )}
          >
            {score?.overall ? score.overall.toFixed(1) : "0.0"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground">Độ chính xác</span>
          <span
            className={cn(
              "text-2xl sm:text-3xl font-black font-mono mt-1",
              score?.accuracy ? "text-emerald-500" : "text-rose-500/80"
            )}
          >
            {score?.accuracy ? score.accuracy.toFixed(1) : "0.0"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground">Độ trôi chảy</span>
          <span
            className={cn(
              "text-2xl sm:text-3xl font-black font-mono mt-1",
              score?.fluency ? "text-emerald-500" : "text-rose-500/80"
            )}
          >
            {score?.fluency ? score.fluency.toFixed(1) : "0.0"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground">Độ hoàn thiện</span>
          <span
            className={cn(
              "text-2xl sm:text-3xl font-black font-mono mt-1",
              score?.completeness ? "text-emerald-500" : "text-rose-500/80"
            )}
          >
            {score?.completeness ? score.completeness.toFixed(1) : "0.0"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col bg-background select-none",
        currentView === "studio" ? "h-[calc(100vh-3.5rem)] overflow-hidden" : "min-h-full"
      )}
    >
      <WordLookupPopup
        word={popupWord}
        anchorEl={popupAnchor}
        onClose={() => {
          setPopupWord(null);
          setPopupAnchor(null);
        }}
        onSaveToDeck={handleSaveWordToDeck}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 1: SHADOWING HUB (MÀN CHÍNH - LỊCH SỬ & DÁN LINK YOUTUBE)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentView === "hub" && (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-28">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <Link href="/foundation">
                <Button variant="ghost" size="sm" className="size-8 p-0 rounded-xl" title="Quay lại Hub Foundation">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                  <Film className="size-6 text-primary" />
                  <span>Shadowing Hub</span>
                </h1>
              </div>
            </div>

            {/* Quick Resume Button if active video available */}
            {activeLesson && (
              <Button
                onClick={() => setCurrentView("studio")}
                className="h-9 px-4 rounded-xl text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm shrink-0"
              >
                <Play className="size-3.5 fill-current" />
                <span>Tiếp tục bài đang học</span>
              </Button>
            )}
          </div>

          {/* ── YOUTUBE LINK EXTRACTOR (MINIMALIST SEARCH BAR) ── */}
          <div className="shrink-0 w-full p-3 sm:p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
              <div className="relative flex-1 min-h-[44px]">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 flex items-center pointer-events-none">
                  <YouTubeIcon className="size-5" />
                </div>

                <Input
                  ref={youtubeInputRef}
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadCustomYouTubeUrl()}
                  placeholder="Dán link YouTube (https://www.youtube.com/watch?v=... hoặc youtu.be/...) để học ngay"
                  className="h-11 pl-10 pr-20 text-xs sm:text-sm font-medium bg-background rounded-xl border border-border/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {customUrlInput ? (
                    <button
                      onClick={() => setCustomUrlInput("")}
                      className="size-7 rounded-lg hover:bg-muted text-muted-foreground flex items-center justify-center transition-colors"
                      title="Xóa nội dung"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePasteClipboard(false)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all flex items-center gap-1"
                      title="Dán nhanh từ bộ nhớ tạm"
                    >
                      <Copy className="size-3" />
                      <span>Dán</span>
                    </button>
                  )}
                </div>
              </div>

              <Button
                onClick={() => handleLoadCustomYouTubeUrl()}
                disabled={isLoadingCustomUrl || !customUrlInput.trim()}
                className="h-11 px-5 rounded-xl font-bold text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 gap-1.5 shadow-sm transition-all"
              >
                {isLoadingCustomUrl ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Đang tải phụ đề...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    <span>Trích xuất & Học ngay</span>
                  </>
                )}
              </Button>
            </div>
          </div>


          {/* ── KHO BÀI HỌC VIDEO (CRUD LIBRARY) ── */}
          <div className="shrink-0 space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Library className="size-4 text-primary" />
                <h3 className="text-base font-extrabold text-foreground">Kho Video Bài Học</h3>
                <Badge variant="secondary" className="text-xs font-mono h-5">
                  {filteredLibrary.length}
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Add Video Button */}
                <Button
                  size="sm"
                  onClick={() => setShowAddVideoModal(true)}
                  className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shrink-0"
                >
                  <PlusCircle className="size-3.5" />
                  <span>Thêm video YouTube</span>
                </Button>

                {/* Search bar */}
                <div className="relative w-full sm:w-56">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Tìm bài học, kênh..."
                    className="h-8 pl-8 pr-7 text-xs rounded-xl bg-card border-border/80"
                  />
                  {librarySearch && (
                    <button
                      onClick={() => setLibrarySearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Grid or Empty state */}
            {filteredLibrary.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-border/80 text-center flex flex-col items-center justify-center space-y-2 bg-card/40">
                <Library className="size-10 text-muted-foreground/40" />
                <p className="font-bold text-sm text-foreground">Không tìm thấy bài học nào phù hợp</p>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  {librarySearch
                    ? "Hãy thử tìm kiếm với từ khóa khác."
                    : "Kho video đang trống. Hãy dán liên kết YouTube ở trên để thêm bài học mới."}
                </p>
                {librarySearch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLibrarySearch("")}
                    className="h-8 text-xs rounded-xl mt-2"
                  >
                    Xóa tìm kiếm
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLibrary.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectLesson(item)}
                    className="p-3.5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video rounded-xl overflow-hidden bg-black relative shrink-0">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute bottom-1.5 right-1.5 text-[9px] font-mono px-1.5 py-0 bg-black/80 text-white">
                        {item.duration}
                      </Badge>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                          <Play className="size-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">{item.channel}</p>
                      <p className="text-[11px] text-primary font-medium">
                        {item.segments.length} câu luyện tập
                      </p>
                    </div>

                    {/* Action buttons footer (Edit & Delete & Play) */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectLesson(item);
                        }}
                        className="h-7 px-2.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                      >
                        <Play className="size-3 fill-current" />
                        <span>Học</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleOpenEditModal(item, e)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                          title="Sửa thông tin video"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteFromLibrary(item.id, e)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                          title="Xóa khỏi thư viện"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── EDIT LESSON MODAL (UPDATE) ── */}
          {editingLesson && (
            <div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
              onClick={() => setEditingLesson(null)}
            >
              <div
                className="w-full max-w-md bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Pencil className="size-4 text-primary" />
                    <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                      Chỉnh sửa thông tin bài học
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingLesson(null)}
                    className="size-7 rounded-lg hover:bg-muted text-muted-foreground flex items-center justify-center"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Tiêu đề bài học</label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Nhập tiêu đề bài học..."
                      className="text-xs sm:text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Kênh / Nguồn</label>
                    <Input
                      value={editChannel}
                      onChange={(e) => setEditChannel(e.target.value)}
                      placeholder="Tên kênh YouTube..."
                      className="text-xs sm:text-sm rounded-xl"
                    />
                  </div>

                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLesson(null)}
                    className="rounded-xl text-xs"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 2: STUDIO PLAYER (PHÒNG LUYỆN SHADOWING & PHÁT ÂM)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentView === "studio" && (
        <>
          {/* ── STUDIO TOP NAV BAR ── */}
          <header className="h-14 border-b border-border/80 bg-card/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 z-20">
            {/* Left: Back to Hub + Video Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView("hub")}
                className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80 hover:bg-muted text-foreground"
                title="Quay về Màn Chính (Hub)"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Màn chính</span>
              </Button>

              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-foreground truncate max-w-[160px] sm:max-w-[280px] md:max-w-[400px]">
                  {activeLesson.title}
                </h1>
              </div>

              {/* Add YouTube Video Button in Studio */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddVideoModal(true)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0 hidden sm:flex"
                title="Dán link nạp video YouTube mới"
              >
                <PlusCircle className="size-3.5" />
                <span>Nạp video khác</span>
              </Button>
            </div>

            {/* Right: Mode Tabs: [Shadowing] [Phát âm] */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  if (isPlayingVideo) pauseVideo();
                  setActiveMode("shadowing");
                }}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5",
                  activeMode === "shadowing"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60"
                )}
              >
                <span>Shadowing</span>
              </button>

              <button
                onClick={() => {
                  if (isPlayingVideo) pauseVideo();
                  setActiveMode("pronounce");
                }}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5",
                  activeMode === "pronounce"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/60"
                )}
              >
                <span>Phát âm</span>
              </button>
            </div>
          </header>

          {/* ── PERSISTENT STUDIO WORKSPACE (Single Grid for both modes) ── */}
          <main className="flex-1 p-2.5 sm:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
            {/* LEFT COLUMN: 8 cols in Shadowing, 6 cols in Pronounce */}
            <div
              className={cn(
                "h-full flex flex-col gap-2 min-h-0 overflow-hidden",
                activeMode === "shadowing" ? "lg:col-span-8" : "lg:col-span-6 gap-2.5"
              )}
            >
              {/* Persistent Video Player Container - NEVER unmounted to preserve YouTube iframe */}
              <div
                ref={playerContainerRef}
                className={cn(
                  "shrink-0 aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border/80 shadow-lg relative",
                  activeMode === "pronounce" && isVideoHidden && "hidden"
                )}
              >
                <div id="corodomo-yt-player" className="w-full h-full absolute inset-0" />
              </div>

              {/* Mode-specific Left Controls */}
              {activeMode === "shadowing" ? renderShadowingLeftControls() : renderPronounceLeftControls()}
            </div>

            {/* RIGHT COLUMN: 4 cols in Shadowing (Sidebar), 6 cols in Pronounce (Grading Panel) */}
            <div
              className={cn(
                "h-full min-h-0 overflow-hidden",
                activeMode === "shadowing" ? "lg:col-span-4" : "lg:col-span-6"
              )}
            >
              {activeMode === "shadowing" ? renderShadowingSidebar() : renderPronouncePanel()}
            </div>
          </main>

          {/* Session Completed Modal */}
          <SessionCompletedModal
            open={showCompletedModal}
            onOpenChange={setShowCompletedModal}
            sessionTitle={activeLesson.title}
            durationMinutes={Math.max(1, Math.round(elapsedSec / 60))}
            turnsCount={completedCount}
            overallScore={
              completedCount
                ? Math.round(
                    Object.values(sentenceScores).reduce((a, b) => a + b.overall, 0) / completedCount
                  )
                : 85
            }
            onRestart={() => {
              setActiveSegmentIndex(0);
              setScore(null);
              setUserAudioUrl(null);
              setSentenceScores({});
              setShowCompletedModal(false);
            }}
          />
        </>
      )}

      {/* ── MODAL: THÊM BÀI HỌC TỪ YOUTUBE (POPUP TOÀN HỆ THỐNG) ── */}
      {showAddVideoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddVideoModal(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border/80 ring-1 ring-primary/25 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
                  <YouTubeIcon className="size-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                    Thêm bài học từ YouTube
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowAddVideoModal(false)}
                className="size-8 rounded-xl hover:bg-muted text-muted-foreground flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Input & Paste */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span>Đường dẫn video YouTube:</span>
                <button
                  type="button"
                  onClick={() => handlePasteClipboard(true)}
                  className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Copy className="size-3" />
                  <span>Dán từ clipboard</span>
                </button>
              </label>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 flex items-center pointer-events-none">
                  <YouTubeIcon className="size-4" />
                </div>
                <Input
                  value={modalUrlInput}
                  onChange={(e) => setModalUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadCustomYouTubeUrl(modalUrlInput)}
                  placeholder="https://www.youtube.com/watch?v=... hoặc youtu.be/..."
                  className="h-11 pl-9 pr-8 text-xs sm:text-sm rounded-xl border-border/80 focus-visible:border-primary"
                  autoFocus
                />
                {modalUrlInput && (
                  <button
                    onClick={() => setModalUrlInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>


            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddVideoModal(false)}
                className="rounded-xl text-xs h-9"
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={() => handleLoadCustomYouTubeUrl(modalUrlInput)}
                disabled={isLoadingCustomUrl || !modalUrlInput.trim()}
                className="rounded-xl text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-md shadow-primary/25"
              >
                {isLoadingCustomUrl ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Đang trích xuất phụ đề...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    <span>Trích xuất & Học ngay</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN VIDEO ĐÃ TỒN TẠI TRONG THƯ VIỆN ── */}
      {duplicatePrompt?.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setDuplicatePrompt(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border/80 ring-1 ring-primary/25 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Film className="size-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                    Video đã có trong thư viện
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Bài học này đã được lưu và sẵn sàng để luyện tập
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDuplicatePrompt(null)}
                className="size-8 rounded-xl hover:bg-muted text-muted-foreground flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Video preview card */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center gap-3">
              {duplicatePrompt.lesson.thumbnail && (
                <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border border-border/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={duplicatePrompt.lesson.thumbnail}
                    alt={duplicatePrompt.lesson.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="size-4 text-white fill-current" />
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                  {duplicatePrompt.lesson.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] font-mono h-4.5 text-primary border-primary/40">
                    {duplicatePrompt.lesson.segments?.length || 0} câu thoại
                  </Badge>
                  {duplicatePrompt.lesson.channel && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {duplicatePrompt.lesson.channel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bài học này đã có trong thư viện. Bạn muốn mở để luyện tập tiếp hay tải lại phụ đề mới?
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDuplicatePrompt(null)}
                className="rounded-xl text-xs h-9 order-3 sm:order-1"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = duplicatePrompt.url;
                  setDuplicatePrompt(null);
                  handleLoadCustomYouTubeUrl(url, true);
                }}
                className="rounded-xl text-xs h-9 border-border/80 hover:bg-muted font-semibold gap-1.5 order-2"
              >
                <RotateCcw className="size-3.5" />
                <span>Tải lại từ YouTube</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const lesson = duplicatePrompt.lesson;
                  setDuplicatePrompt(null);
                  setShowAddVideoModal(false);
                  setCustomUrlInput("");
                  setModalUrlInput("");
                  handleSelectLesson(lesson);
                }}
                className="rounded-xl text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-md shadow-primary/25 order-1 sm:order-3"
              >
                <Play className="size-3.5 fill-current" />
                <span>Mở bài đã lưu</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
