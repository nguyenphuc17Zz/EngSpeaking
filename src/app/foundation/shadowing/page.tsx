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
  Repeat1,
  PauseCircle,
  Headphones,
  Square,
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
  Sun,
  Moon,
} from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export type ShadowingPlayMode = "continuous" | "pause_after_sentence" | "loop_sentence";

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
  const recorder = useAudioRecorder({ keepWarm: true });
  const speechRec = useSpeechRecognition("en-US");

  // ─── Top-Level View State: "hub" (Màn chính) | "studio" (Phòng học) ─
  const [currentView, setCurrentView] = useState<MainView>("hub");
  const [activeMode, setActiveMode] = useState<StudioMode>("shadowing");
  const setHideAppHeader = useUiStore((s) => s.setHideAppHeader);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  useEffect(() => {
    if (currentView === "studio") {
      setHideAppHeader(true);
    } else {
      setHideAppHeader(false);
    }
    return () => setHideAppHeader(false);
  }, [currentView, setHideAppHeader]);

  // ─── Lesson & Practice State ─────────────────────────────────────────
  const [activeLesson, setActiveLesson] = useState<CorodomoVideoLesson>(CORODOMO_VIDEO_PRESETS[0]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const activeSegmentIndexRef = useRef(0);
  activeSegmentIndexRef.current = activeSegmentIndex;

  // ─── Playback & Sync State ───────────────────────────────────────────
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [playMode, setPlayMode] = useState<ShadowingPlayMode>("continuous");
  const playModeRef = useRef<ShadowingPlayMode>("continuous");
  playModeRef.current = playMode;

  const justPausedSegRef = useRef<number>(-1);
  const isLoopSeekingRef = useRef<boolean>(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const seekToSegmentRef = useRef<(index: number, autoPlay?: boolean) => void>(() => {});

  const isLooping = playMode === "loop_sentence";
  const autoPauseEnabled = playMode === "pause_after_sentence";
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
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const [sentenceScores, setSentenceScores] = useState<Record<string, ShadowingScoreResult>>({});
  const [recordingStartMs, setRecordingStartMs] = useState(0);

  // ─── Shadowing Mode Voice Recording & Preview State ──────────────────
  const [shadowingRecordStatus, setShadowingRecordStatus] = useState<"idle" | "recording">("idle");
  const [shadowingAudioUrl, setShadowingAudioUrl] = useState<string | null>(null);
  const [isPlayingShadowingAudio, setIsPlayingShadowingAudio] = useState(false);
  const [shadowingTranscript, setShadowingTranscript] = useState("");
  const [showShadowingPreview, setShowShadowingPreview] = useState(true);
  const shadowingAudioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Subtitle Synchronization Offset (Lead-time Compensation) ────────
  const [subtitleSyncOffset, setSubtitleSyncOffset] = useState<number>(0.35); // Default +0.35s lead compensation
  const subtitleSyncOffsetRef = useRef<number>(0.35);
  subtitleSyncOffsetRef.current = subtitleSyncOffset;

  const handleAdjustSyncOffset = useCallback((delta: number) => {
    setSubtitleSyncOffset((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      subtitleSyncOffsetRef.current = next;
      toast.info(
        "Căn chỉnh phụ đề",
        `Lệch: ${next > 0 ? `+${next}s (Hiện sớm hơn)` : next < 0 ? `${next}s (Hiện muộn hơn)` : "0s (Khớp gốc)"}`
      );
      return next;
    });
  }, []);

  const handleResetSyncOffset = useCallback(() => {
    setSubtitleSyncOffset(0.35);
    subtitleSyncOffsetRef.current = 0.35;
    toast.success("Căn chỉnh phụ đề", "Đã đặt về mức bù chuẩn (+0.35s)");
  }, []);

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
              if (event.data === 1) {
                setIsPlayingVideo(true);
                // If user unpaused directly on YouTube player while stopped at sentence end -> advance to next sentence!
                if (playModeRef.current === "pause_after_sentence" && justPausedSegRef.current !== -1) {
                  const cur = justPausedSegRef.current;
                  const total = activeLesson?.segments?.length || 0;
                  const nextIdx = cur < total - 1 ? cur + 1 : 0;
                  justPausedSegRef.current = -1;
                  setIsAutoPaused(false);
                  seekToSegmentRef.current(nextIdx, true);
                }
              } else if (event.data === 2 || event.data === 0) {
                setIsPlayingVideo(false);
              }
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
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
      if (shadowingAudioRef.current) {
        shadowingAudioRef.current.pause();
        shadowingAudioRef.current = null;
      }
    };
  }, [currentView, activeLesson?.youtubeId, initYouTubePlayer]);

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

  // ─── Real-Time Sentence Synchronization Tracking (Hysteresis Engine) ───
  useEffect(() => {
    if (currentView !== "studio") return;

    let animId: number;
    let lastTimeCheck = 0;

    const syncLoop = () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const now = performance.now();
        // High-precision 40 FPS synchronization polling (25ms instead of 80ms)
        if (now - lastTimeCheck > 25) {
          lastTimeCheck = now;
          try {
            const time = playerRef.current.getCurrentTime();
            if (typeof time === "number" && !isNaN(time)) {
              setCurrentTime(time);

              const segments = activeLesson.segments;
              if (segments.length > 0) {
                const curIdx = activeSegmentIndexRef.current;
                const currentSeg = segments[curIdx];

                // ─── 1. MODE: LẶP 1 CÂU (loop_sentence) ─────────────────────
                if (playModeRef.current === "loop_sentence" && currentSeg) {
                  const isAtEndOfSentence = time >= currentSeg.end_time - 0.08;
                  if (isAtEndOfSentence && !isLoopSeekingRef.current) {
                    isLoopSeekingRef.current = true;
                    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
                      playerRef.current.seekTo(currentSeg.start_time, true);
                    }
                    setTimeout(() => {
                      isLoopSeekingRef.current = false;
                    }, 300);
                  }
                  // Lock sync engine to currently looping sentence, never advance automatically!
                  animId = requestAnimationFrame(syncLoop);
                  return;
                }

                // ─── 2. MODE: DỪNG SAU CÂU (pause_after_sentence) ───────────
                if (playModeRef.current === "pause_after_sentence" && currentSeg) {
                  const isAtEndOfSentence = time >= currentSeg.end_time - 0.08;

                  // If user resumed playing while waiting at sentence end -> advance to next sentence!
                  if (justPausedSegRef.current === curIdx) {
                    const playerState =
                      typeof playerRef.current.getPlayerState === "function"
                        ? playerRef.current.getPlayerState()
                        : -1;
                    if (playerState === 1) {
                      justPausedSegRef.current = -1;
                      setIsAutoPaused(false);
                      const nextIdx = curIdx < segments.length - 1 ? curIdx + 1 : 0;
                      seekToSegmentRef.current(nextIdx, true);
                      animId = requestAnimationFrame(syncLoop);
                      return;
                    }
                    // While video is paused, stay on this sentence
                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }

                  // If reaching sentence end, pause immediately!
                  if (isAtEndOfSentence) {
                    justPausedSegRef.current = curIdx;
                    setIsAutoPaused(true);
                    pauseVideo();
                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }

                  // While playing inside current sentence, KEEP activeSegment locked to curIdx!
                  // Never let continuous sync jump ahead before sentence finishes!
                  animId = requestAnimationFrame(syncLoop);
                  return;
                }

                // ─── Continuous Mode: High-Fidelity Lead-Compensated Sync ──
                // Apply user sync offset (default +0.35s) to eliminate YouTube postMessage latency
                const syncOffset = subtitleSyncOffsetRef.current;
                const syncTime = time + syncOffset;

                let matchedIdx = -1;

                // Priority 1: Next Segment Check (Early Transition)
                // If next segment has begun or is within 50ms of beginning, switch to it immediately!
                const nextSeg = segments[curIdx + 1];
                if (nextSeg && syncTime >= nextSeg.start_time - 0.05) {
                  matchedIdx = curIdx + 1;
                } else if (
                  // Priority 2: Active segment check
                  currentSeg &&
                  syncTime >= currentSeg.start_time - 0.1 &&
                  syncTime < currentSeg.end_time + 0.1
                ) {
                  matchedIdx = curIdx;
                } else {
                  // Priority 3: Fallback exact scan
                  matchedIdx = segments.findIndex(
                    (seg) => syncTime >= seg.start_time - 0.1 && syncTime < seg.end_time + 0.1
                  );

                  // Priority 4: Natural Pause Bridge between two sentences
                  if (matchedIdx === -1) {
                    for (let s = 0; s < segments.length; s++) {
                      const seg = segments[s];
                      const next = segments[s + 1];
                      if (syncTime >= seg.end_time && next && syncTime < next.start_time) {
                        // If within 250ms of next start, switch ahead to next segment so user can anticipate
                        matchedIdx = syncTime >= next.start_time - 0.25 ? s + 1 : s;
                        break;
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
  }, [currentView, activeLesson.segments, pauseVideo]);

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
  const cyclePlayMode = useCallback(() => {
    const current = playModeRef.current;
    let next: ShadowingPlayMode;

    if (current === "continuous") {
      next = "pause_after_sentence";
      toast.info(
        "Chế độ: Dừng sau mỗi câu",
        "Video sẽ tự động dừng ở cuối mỗi câu để bạn nói theo. Bấm Space hoặc Play/Next để sang câu tiếp."
      );
    } else if (current === "pause_after_sentence") {
      next = "loop_sentence";
      toast.info(
        "Chế độ: Lặp lại 1 câu",
        "Video sẽ tự động lặp lại liên tục câu hiện tại để luyện ngữ điệu sâu."
      );
    } else {
      next = "continuous";
      toast.info(
        "Chế độ: Phát liên tục",
        "Video sẽ chạy liền mạch từ đầu tới cuối mà không dừng."
      );
    }

    playModeRef.current = next;
    justPausedSegRef.current = -1;
    setIsAutoPaused(false);
    isLoopSeekingRef.current = false;
    setPlayMode(next);
  }, []);

  const handleSelectPlayMode = useCallback((mode: ShadowingPlayMode) => {
    if (mode === "continuous") {
      toast.info(
        "Chế độ: Phát liên tục",
        "Video sẽ chạy liền mạch từ đầu tới cuối mà không dừng."
      );
    } else if (mode === "pause_after_sentence") {
      toast.info(
        "Chế độ: Dừng sau mỗi câu",
        "Video sẽ tự động dừng ở cuối mỗi câu để bạn nói theo. Bấm Space hoặc Play/Next để sang câu tiếp."
      );
    } else if (mode === "loop_sentence") {
      toast.info(
        "Chế độ: Lặp lại 1 câu",
        "Video sẽ tự động lặp lại liên tục câu hiện tại để luyện ngữ điệu sâu."
      );
      const cur = activeSegmentIndexRef.current;
      const seg = activeLesson?.segments?.[cur];
      if (seg && playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(seg.start_time, true);
        playerRef.current.playVideo?.();
        setIsPlayingVideo(true);
      }
    }

    playModeRef.current = mode;
    justPausedSegRef.current = -1;
    setIsAutoPaused(false);
    isLoopSeekingRef.current = false;
    setPlayMode(mode);
  }, [activeLesson?.segments]);

  const handleTogglePlayUserAudio = useCallback(() => {
    if (!userAudioUrl) return;

    if (userAudioRef.current && isPlayingUserAudio) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
      setIsPlayingUserAudio(false);
      return;
    }

    if (userAudioRef.current) {
      userAudioRef.current.pause();
    }

    const audio = new Audio(userAudioUrl);
    userAudioRef.current = audio;
    setIsPlayingUserAudio(true);

    audio.onended = () => setIsPlayingUserAudio(false);
    audio.onerror = () => setIsPlayingUserAudio(false);
    audio.play().catch(() => setIsPlayingUserAudio(false));
  }, [userAudioUrl, isPlayingUserAudio]);

  // ─── Shadowing Audio Recording & Preview Handlers ─────────────────────
  const handleTogglePlayShadowingAudio = useCallback(() => {
    if (!shadowingAudioUrl) return;

    if (shadowingAudioRef.current && isPlayingShadowingAudio) {
      shadowingAudioRef.current.pause();
      shadowingAudioRef.current.currentTime = 0;
      setIsPlayingShadowingAudio(false);
      return;
    }

    if (shadowingAudioRef.current) {
      shadowingAudioRef.current.pause();
    }

    const audio = new Audio(shadowingAudioUrl);
    shadowingAudioRef.current = audio;
    setIsPlayingShadowingAudio(true);

    audio.onended = () => setIsPlayingShadowingAudio(false);
    audio.onerror = () => setIsPlayingShadowingAudio(false);
    audio.play().catch(() => setIsPlayingShadowingAudio(false));
  }, [shadowingAudioUrl, isPlayingShadowingAudio]);

  const handleToggleShadowingRecord = useCallback(async () => {
    if (shadowingRecordStatus === "recording") {
      soundEffects.playMicStop();
      const sttProvider = settings.stt?.provider || "browser";
      if (sttProvider === "browser") {
        speechRec.stopListening();
      }
      setShadowingRecordStatus("idle");
      try {
        const recording = await recorder.stop();
        let spokenText = "";

        if (sttProvider !== "browser" && recording?.blob) {
          try {
            const res = await transcribeViaServer(recording.blob, {
              provider: sttProvider === "auto" ? "whisper-local" : sttProvider,
              model: settings.stt?.model || "auto",
              language: "en-US",
              prompt: currentSegment.text,
            });
            spokenText = res.text.trim();
          } catch {
            spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
          }
        } else {
          await new Promise((r) => setTimeout(r, 200));
          spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
        }

        if (recording?.blob) {
          const audioUrl = URL.createObjectURL(recording.blob);
          setShadowingAudioUrl(audioUrl);
        }

        setShadowingTranscript(spokenText);
        setShowShadowingPreview(true);

        if (spokenText) {
          toast.success("Đã thu âm xong!", "Kiểm tra những gì bạn vừa nói bên dưới.");
        } else {
          toast.info("Đã thu âm xong!", "Bấm 'Nghe lại' để kiểm tra giọng bạn.");
        }
      } catch (err) {
        console.error("Lỗi dừng thu âm shadowing:", err);
      }
      return;
    }

    pauseVideo();
    if (shadowingAudioRef.current) {
      shadowingAudioRef.current.pause();
      shadowingAudioRef.current = null;
    }
    setIsPlayingShadowingAudio(false);
    setShadowingAudioUrl(null);
    setShadowingTranscript("");
    setShowShadowingPreview(true);
    speechRec.resetTranscript();

    const sttProvider = settings.stt?.provider || "browser";
    try {
      await recorder.start();
      if (sttProvider === "browser") {
        speechRec.startListening();
      }
      soundEffects.playMicStart();
      setShadowingRecordStatus("recording");
    } catch {
      toast.error("Lỗi Microphone", "Vui lòng cho phép quyền truy cập micro.");
      setShadowingRecordStatus("idle");
    }
  }, [
    shadowingRecordStatus,
    recorder,
    pauseVideo,
    speechRec,
    settings.stt?.provider,
    settings.stt?.model,
  ]);

  const seekToSegment = useCallback(
    (index: number, autoPlay = true) => {
      if (!activeLesson.segments[index]) return;
      if (autoPauseTimerRef.current) clearTimeout(autoPauseTimerRef.current);

      setActiveSegmentIndex(index);
      activeSegmentIndexRef.current = index;
      justPausedSegRef.current = -1;
      setIsAutoPaused(false);
      isLoopSeekingRef.current = false;
      setScore(null);
      setUserAudioUrl(null);
      setSpokenTranscript("");
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
      setIsPlayingUserAudio(false);
      speechRec.resetTranscript();

      // Reset Shadowing mode audio preview & recording
      setShadowingAudioUrl(null);
      setShadowingTranscript("");
      setShowShadowingPreview(false);
      if (shadowingAudioRef.current) {
        shadowingAudioRef.current.pause();
        shadowingAudioRef.current = null;
      }
      setIsPlayingShadowingAudio(false);
      setShadowingRecordStatus("idle");

      const seg = activeLesson.segments[index];
      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(seg.start_time, true);
        if (autoPlay) {
          playerRef.current.playVideo();
          setIsPlayingVideo(true);
        }
      }
    },
    [activeLesson.segments, speechRec]
  );
  seekToSegmentRef.current = seekToSegment;

  const handleTogglePlayVideo = useCallback(() => {
    if (isPlayingVideo) {
      pauseVideo();
    } else {
      // Pause any ongoing shadowing voice playback
      if (shadowingAudioRef.current && isPlayingShadowingAudio) {
        shadowingAudioRef.current.pause();
        setIsPlayingShadowingAudio(false);
      }

      const cur = activeSegmentIndexRef.current;
      const currentSeg = activeLesson.segments[cur];

      if (
        playModeRef.current === "pause_after_sentence" &&
        (justPausedSegRef.current !== -1 ||
          (currentSeg && currentTime >= currentSeg.end_time - 0.2))
      ) {
        // Paused at end of sentence -> advance to next sentence!
        const nextIdx = cur < activeLesson.segments.length - 1 ? cur + 1 : 0;
        justPausedSegRef.current = -1;
        setIsAutoPaused(false);
        seekToSegment(nextIdx, true);
      } else {
        playVideo();
      }
    }
  }, [isPlayingVideo, currentTime, activeLesson.segments, pauseVideo, playVideo, seekToSegment]);

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
    setScore(null);
    setUserAudioUrl(null);
    setSpokenTranscript("");
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current = null;
    }
    setIsPlayingUserAudio(false);
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
            prompt: currentSegment.text,
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
      setSpokenTranscript(spokenText);
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
          handleTogglePlayVideo();
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
      } else if (e.code === "KeyM" && activeMode === "shadowing") {
        e.preventDefault();
        handleToggleShadowingRecord();
      } else if (e.code === "KeyL" && activeMode === "shadowing") {
        e.preventDefault();
        cyclePlayMode();
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
    handleTogglePlayVideo,
    handlePrevSegment,
    handleNextSegment,
    handleToggleShadowingRecord,
    cyclePlayMode,
  ]);

  // ─── Word Lookup Handler ─────────────────────────────────────────────
  const handleWordClick = (word: string, e?: React.MouseEvent<HTMLElement>) => {
    // Automatically pause video so the pronunciation can be clearly heard without overlap
    pauseVideo();
    if (autoPauseTimerRef.current) {
      clearTimeout(autoPauseTimerRef.current);
      autoPauseTimerRef.current = null;
    }

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
      setShadowingAudioUrl(null);
      if (shadowingAudioRef.current) {
        shadowingAudioRef.current.pause();
        shadowingAudioRef.current = null;
      }
      setIsPlayingShadowingAudio(false);
      setShadowingRecordStatus("idle");
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
    setShadowingAudioUrl(null);
    if (shadowingAudioRef.current) {
      shadowingAudioRef.current.pause();
      shadowingAudioRef.current = null;
    }
    setIsPlayingShadowingAudio(false);
    setShadowingRecordStatus("idle");
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
  const renderShadowingLeftControls = () => {
    const targetWords = currentSegment.text
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\w']/g, ""))
      .filter(Boolean);
    const spokenWords = shadowingTranscript.trim().split(/\s+/).filter(Boolean);
    const matchedCount = spokenWords.filter((w) =>
      targetWords.includes(w.toLowerCase().replace(/[^\w']/g, ""))
    ).length;

    return (
      <>
        {/* Subtitle Pill & Translation Area (Placed Below Video, matching Corodomo) */}
        <div className="shrink-0 flex flex-col items-center justify-center px-2 py-1 text-center select-text min-h-[64px]">
          {showSubtitle && (
            <div className="inline-flex flex-wrap items-end justify-center gap-x-2 gap-y-0.5 bg-[#1e2329] dark:bg-[#181d24] text-white px-3.5 py-1.5 rounded-xl border border-white/10 shadow-md">
              {currentSentenceTokens.map((token, i) => (
                <div
                  key={i}
                  onClick={(e) => handleWordClick(token.cleanWord, e)}
                  className="inline-flex flex-col items-center cursor-pointer group px-1 py-0.5 rounded transition-all hover:bg-white/10"
                  title={`Click để tra từ: "${token.cleanWord}"`}
                >
                  <span className="text-[10px] font-mono text-amber-300 font-semibold leading-none mb-0.5 select-none tracking-tight">
                    {token.ipa || "—"}
                  </span>
                  <span className="text-sm sm:text-[15px] font-bold text-white group-hover:text-amber-200 transition-colors leading-tight">
                    {token.word}
                  </span>
                </div>
              ))}
            </div>
          )}

          {showTranslation && currentSegment.translationVi && (
            <p className="text-xs text-foreground/90 font-bold leading-tight mt-1 max-w-2xl line-clamp-2">
              {currentSegment.translationVi}
            </p>
          )}

          {/* Listen & Repeat (Pause After Sentence) Status Banner */}
          {playMode === "pause_after_sentence" && (justPausedSegRef.current === activeSegmentIndex || isAutoPaused) && !isPlayingVideo && (
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-in fade-in-0 zoom-in-95 shadow-xs">
              <PauseCircle className="size-3.5 animate-pulse shrink-0" />
              <span>Đã dừng cuối câu • Bấm Nói (phím M) để luyện theo, hoặc bấm Play / Space để sang câu sau</span>
            </div>
          )}
        </div>

        {/* ── Speech Preview in Shadowing Mode (Placed between Subtitle and Controls) ── */}
        {/* 1. Live Speech Recognition Preview (While Recording) */}
        {shadowingRecordStatus === "recording" && (
          <div className="shrink-0 mb-1 px-3 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 animate-in fade-in-0 zoom-in-95 duration-150 shadow-xs flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-between w-full max-w-2xl px-1">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-rose-500" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Đang nhận diện giọng nói (Phím M hoặc bấm Nói để dừng)
                </span>
              </div>

              {/* Live Audio Volume Visualizer Meter */}
              <div className="flex items-center gap-1.5 bg-background/60 px-2 py-0.5 rounded-full border border-border/50">
                <div className="flex items-end gap-0.5 h-3.5">
                  {[0.4, 0.7, 1.0, 0.8, 0.5].map((multiplier, idx) => {
                    const barHeight = Math.max(
                      3,
                      Math.min(14, Math.round((recorder.volume / 100) * 14 * multiplier + 2))
                    );
                    return (
                      <span
                        key={idx}
                        className="w-1 rounded-full bg-rose-500 transition-all duration-75"
                        style={{ height: `${barHeight}px` }}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 select-none">
                  {recorder.volume}%
                </span>
              </div>
            </div>

            <div className="w-full max-w-2xl bg-background/80 backdrop-blur px-3 py-2 rounded-xl border border-border/60 min-h-[36px] flex items-center justify-center text-center select-text">
              {speechRec.fullTranscript ? (
                <p className="text-sm sm:text-base font-bold text-primary font-mono leading-snug">
                  {speechRec.fullTranscript}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/70 italic">
                  Đang lắng nghe... Hãy nhại theo câu mẫu vào micro
                </p>
              )}
            </div>

            {/* Low-Volume Warning */}
            {recorder.isTooQuiet && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-in fade-in-0 duration-150">
                <span>⚠️ Âm lượng micro đang rất nhỏ — hãy đưa micro gần lại hoặc nói to hơn nhé!</span>
              </div>
            )}
          </div>
        )}

        {/* 2. Finished Speech Preview & Word Comparison (After Recording) */}
        {shadowingRecordStatus === "idle" && showShadowingPreview && (shadowingTranscript || shadowingAudioUrl) && (
          <div className="shrink-0 mb-1 px-3 py-2.5 rounded-2xl bg-card/95 backdrop-blur border border-primary/25 shadow-xs animate-in fade-in-0 zoom-in-95 duration-200 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Mic className="size-3.5 text-primary shrink-0" />
                <span className="text-xs font-extrabold text-foreground truncate">
                  Bạn vừa nói:
                </span>
                {shadowingTranscript && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {matchedCount}/{targetWords.length} từ khớp
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {shadowingAudioUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePlayShadowingAudio}
                    className={cn(
                      "h-6 px-2.5 rounded-lg text-[11px] font-bold gap-1 transition-all cursor-pointer",
                      isPlayingShadowingAudio
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                        : "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                    )}
                  >
                    {isPlayingShadowingAudio ? (
                      <Square className="size-2.5 fill-current shrink-0" />
                    ) : (
                      <Headphones className="size-2.5 shrink-0" />
                    )}
                    <span>{isPlayingShadowingAudio ? "Dừng" : "Nghe lại giọng bạn"}</span>
                  </Button>
                )}

                <button
                  onClick={() => setShowShadowingPreview(false)}
                  className="size-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                  title="Đóng bản xem trước"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Word Chips */}
            {shadowingTranscript ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5 select-text py-0.5 max-h-24 overflow-y-auto">
                {spokenWords.map((w, idx) => {
                  const cleanW = w.toLowerCase().replace(/[^\w']/g, "");
                  const isMatch = cleanW && targetWords.includes(cleanW);
                  return (
                    <span
                      key={idx}
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-xs sm:text-[13px] font-semibold font-mono border transition-all",
                        isMatch
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      )}
                      title={isMatch ? "Khớp với câu gốc" : "Khác hoặc chưa chuẩn với câu gốc"}
                    >
                      {w}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-0.5">
                Chưa nhận diện rõ từ ngữ — hãy bấm &apos;Nghe lại giọng bạn&apos; hoặc thử nói to và rõ hơn.
              </p>
            )}
          </div>
        )}

      {/* Video Controls Bar below Video */}
      <div className="shrink-0 px-2.5 py-1.5 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-1.5 shadow-2xs">
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

          {/* Subtitle Sync Calibration (±0.25s) */}
          <div className="hidden sm:flex items-center gap-1 pl-1.5 border-l border-border/50">
            <span
              className="text-[10px] font-mono font-bold text-muted-foreground select-none"
              title="Khớp thời gian hiển thị phụ đề với tiếng nói trong video"
            >
              Sync:
            </span>
            <button
              onClick={() => handleAdjustSyncOffset(-0.25)}
              className="size-5 rounded bg-muted/40 hover:bg-muted text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors select-none cursor-pointer"
              title="Hiện phụ đề muộn hơn 0.25s (-0.25s)"
            >
              -
            </button>
            <button
              onClick={handleResetSyncOffset}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors select-none cursor-pointer",
                subtitleSyncOffset === 0.35
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              )}
              title="Click để reset về mức bù chuẩn (+0.35s)"
            >
              {subtitleSyncOffset > 0 ? `+${subtitleSyncOffset}s` : `${subtitleSyncOffset}s`}
            </button>
            <button
              onClick={() => handleAdjustSyncOffset(0.25)}
              className="size-5 rounded bg-muted/40 hover:bg-muted text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors select-none cursor-pointer"
              title="Hiện phụ đề sớm hơn 0.25s (+0.25s)"
            >
              +
            </button>
          </div>
        </div>

        {/* Center: Play, Navigation & 3-Mode Playback Switcher */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePlayVideo}
            className="size-7 p-0 rounded-lg text-foreground hover:text-primary hover:bg-muted/60"
            title={isPlayingVideo ? "Tạm dừng video (Space)" : "Phát video (Space)"}
          >
            {isPlayingVideo ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevSegment}
            disabled={activeSegmentIndex === 0}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Câu trước (←)"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="text-xs font-mono font-bold text-foreground px-1.5 select-none">
            {activeSegmentIndex + 1} / {activeLesson.segments.length}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSegment}
            disabled={activeSegmentIndex === activeLesson.segments.length - 1}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Câu sau (→)"
          >
            <ChevronRight className="size-4" />
          </Button>

          {/* 3-Mode Playback Button Group */}
          <div className="inline-flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/60">
            <button
              onClick={() => handleSelectPlayMode("continuous")}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none",
                playMode === "continuous"
                  ? "bg-sky-500 text-white shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title="Chế độ: Phát liên tục từ đầu tới cuối"
            >
              <Play className="size-3 shrink-0" />
              <span className="text-[11px] whitespace-nowrap">Liên tục</span>
            </button>

            <button
              onClick={() => handleSelectPlayMode("pause_after_sentence")}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                playMode === "pause_after_sentence"
                  ? "bg-amber-500 text-white shadow-xs font-extrabold ring-1 ring-amber-400/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title="Chế độ: Dừng sau mỗi câu để bạn nói theo (Bấm Space hoặc Play để sang câu tiếp)"
            >
              <PauseCircle className="size-3.5 shrink-0" />
              <span className="text-[11px] whitespace-nowrap">Dừng sau câu</span>
            </button>

            <button
              onClick={() => handleSelectPlayMode("loop_sentence")}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none",
                playMode === "loop_sentence"
                  ? "bg-indigo-600 text-white shadow-xs font-extrabold ring-1 ring-indigo-400/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title="Chế độ: Lặp lại liên tục 1 câu hiện tại để luyện ngữ điệu sâu"
            >
              <Repeat1 className="size-3.5 shrink-0" />
              <span className="text-[11px] whitespace-nowrap">Lặp 1 câu</span>
            </button>
          </div>

          {/* Shadowing Quick Voice Recording & Preview Controls */}
          <span className="w-px h-4 bg-border/60 mx-0.5 hidden xs:inline" />

          <button
            onClick={handleToggleShadowingRecord}
            className={cn(
              "h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer select-none",
              shadowingRecordStatus === "recording"
                ? "bg-rose-500 text-white border-rose-600 animate-pulse shadow-rose-500/20"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/70"
            )}
            title={
              shadowingRecordStatus === "recording"
                ? "Đang thu âm giọng bạn... (Bấm để dừng hoặc phím M)"
                : "Thu âm giọng bạn nhại lại câu này (Phím M)"
            }
          >
            <Mic className={cn("size-3.5 shrink-0", shadowingRecordStatus === "recording" && "animate-bounce text-white")} />
            <span className="text-[11px] font-semibold whitespace-nowrap hidden sm:inline">
              {shadowingRecordStatus === "recording" ? "Đang thu..." : "Nói"}
            </span>
          </button>

          {shadowingAudioUrl && (
            <button
              onClick={handleTogglePlayShadowingAudio}
              className={cn(
                "h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer select-none animate-in fade-in-0 zoom-in-95",
                isPlayingShadowingAudio
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20"
              )}
              title={
                isPlayingShadowingAudio
                  ? "Dừng nghe lại giọng bạn"
                  : "Nghe lại giọng bạn vừa nhại câu này"
              }
            >
              {isPlayingShadowingAudio ? (
                <Square className="size-3 fill-current shrink-0" />
              ) : (
                <Headphones className="size-3.5 shrink-0" />
              )}
              <span className="text-[11px] font-semibold whitespace-nowrap">
                {isPlayingShadowingAudio ? "Dừng" : "Nghe lại"}
              </span>
            </button>
          )}
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
};

  // ─── Mode 1: Synchronized Subtitle Sidebar (Shadowing Right) ────────
  const renderShadowingSidebar = () => (
    <div className="h-full flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs min-h-0">
      {/* Header: "Phụ đề" + Download + Copy */}
      <div className="px-3 py-1.5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-extrabold text-xs text-foreground">Phụ đề</h3>
          <Badge variant="outline" className="text-[10px] font-mono h-4.5 px-1.5 text-muted-foreground">
            {activeLesson.segments.length} câu
          </Badge>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadTranscript}
            className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
            title="Tải phụ đề về máy"
          >
            <Download className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyTranscript}
            className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
            title="Sao chép toàn bộ lời thoại"
          >
            <Copy className="size-3" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-1.5 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={transcriptSearch}
            onChange={(e) => setTranscriptSearch(e.target.value)}
            placeholder="Tìm câu hoặc nghĩa tiếng Việt..."
            className="h-7 pl-6.5 text-[11px] bg-muted/20 rounded-lg"
          />
        </div>
      </div>

      {/* Scrollable Sentence List with Real-time Auto-Scroll Highlight (High Density) */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1"
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
                "p-2 rounded-xl border transition-all cursor-pointer select-text flex items-start gap-2",
                isActive
                  ? "bg-primary/10 border-primary/50 shadow-2xs ring-1 ring-primary/30"
                  : "bg-card hover:bg-muted/30 border-border/50"
              )}
            >
              <button
                className={cn(
                  "size-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isActive && isPlayingVideo ? (
                  <Pause className="size-2.5 fill-current" />
                ) : (
                  <Play className="size-2.5 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs sm:text-[13px] leading-snug",
                    isActive ? "font-bold text-foreground" : "text-foreground/90 font-medium"
                  )}
                >
                  {seg.text}
                </p>

                {seg.translationVi && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
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
  const renderPronouncePanel = () => {
    const hasScore = !!score;
    const overallScore = score?.overall ?? 0;
    const scoreBg =
      overallScore >= 85
        ? "bg-emerald-500 text-white"
        : overallScore >= 65
        ? "bg-amber-500 text-white"
        : "bg-rose-500 text-white";

    return (
      <div className="h-full flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs min-h-0">
        {/* ── Header: Title + Pagination + Quick Settings ── */}
        <div className="px-3 py-1.5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-extrabold text-xs text-foreground">Luyện phát âm</h3>
            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full border border-border/50">
              Câu {activeSegmentIndex + 1}/{activeLesson.segments.length}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevSegment}
              disabled={activeSegmentIndex === 0}
              className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
              title="Câu trước (←)"
            >
              <ChevronLeft className="size-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextSegment}
              disabled={activeSegmentIndex === activeLesson.segments.length - 1}
              className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
              title="Câu sau (→)"
            >
              <ChevronRight className="size-3" />
            </Button>

            <span className="w-px h-3 bg-border/60 mx-0.5" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => tts.speak(currentSegment.text)}
              className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
              title="Nghe Audio mẫu (TTS)"
            >
              <Volume2 className="size-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSubtitle(!showSubtitle)}
              className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
              title="Ẩn/Hiện chữ"
            >
              {showSubtitle ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslation(!showTranslation)}
              className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
              title="Ẩn/Hiện dịch nghĩa"
            >
              <Languages className="size-3" />
            </Button>
          </div>
        </div>

        {/* ── Scrollable Body: Target Sentence + Voice Preview + Score (Compact) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2">
          {/* 1. Target Sentence Box */}
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                CÂU MỤC TIÊU
              </span>
              <span className="text-[10px] text-muted-foreground italic">
                (Click từ để tra nghĩa & nghe phát âm)
              </span>
            </div>

            {showSubtitle ? (
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5 py-1">
                {currentSentenceTokens.map((token, i) => {
                  const clean = token.cleanWord.toLowerCase();
                  let wordClass = "hover:bg-primary/20 hover:text-primary";

                  if (hasScore && clean) {
                    const isCorrect = score.correctWords.some(
                      (w) => w.toLowerCase() === clean
                    );
                    const isMissed = score.missedWords.some(
                      (w) => w.toLowerCase() === clean
                    );

                    if (isCorrect) {
                      wordClass =
                        "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 rounded px-1";
                    } else if (isMissed) {
                      wordClass =
                        "text-rose-600 dark:text-rose-400 line-through bg-rose-500/15 border border-rose-500/30 rounded px-1";
                    } else {
                      wordClass =
                        "text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/15 border border-amber-500/30 rounded px-1";
                    }
                  }

                  return (
                    <div
                      key={i}
                      onClick={(e) => handleWordClick(token.cleanWord, e)}
                      className={cn(
                        "inline-flex flex-col items-center cursor-pointer group px-1 py-0.5 rounded transition-all select-none",
                        wordClass
                      )}
                      title={`Click để tra từ: "${token.cleanWord}"`}
                    >
                      <span className="text-[10px] font-mono font-semibold leading-none mb-0.5 opacity-80">
                        {token.ipa || "—"}
                      </span>
                      <span className="text-base font-extrabold leading-tight">
                        {token.word}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground py-2 italic text-xs">
                <EyeOff className="size-4" />
                <span>Nội dung đã ẩn để bạn tập trung luyện nghe & phản xạ</span>
              </div>
            )}

            {showTranslation && currentSegment.translationVi && (
              <p className="text-xs text-muted-foreground font-medium italic pt-1 border-t border-border/40">
                {currentSegment.translationVi}
              </p>
            )}
          </div>

          {/* Live Recording & Speech Recognition Preview (While Recording) */}
          {recordingStatus === "recording" && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 shadow-xs space-y-2 animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2.5 bg-rose-500" />
                  </span>
                  <span>Đang lắng nghe giọng nói của bạn...</span>
                </span>

                {/* Live Audio Volume Visualizer Meter */}
                <div className="flex items-center gap-1.5 bg-background/60 px-2 py-0.5 rounded-full border border-border/50">
                  <div className="flex items-end gap-0.5 h-3.5">
                    {[0.4, 0.7, 1.0, 0.8, 0.5].map((multiplier, idx) => {
                      const barHeight = Math.max(
                        3,
                        Math.min(14, Math.round((recorder.volume / 100) * 14 * multiplier + 2))
                      );
                      return (
                        <span
                          key={idx}
                          className="w-1 rounded-full bg-rose-500 transition-all duration-75"
                          style={{ height: `${barHeight}px` }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 select-none">
                    {recorder.volume}%
                  </span>
                </div>
              </div>

              <div className="bg-background/80 backdrop-blur p-2.5 rounded-xl border border-border/60 min-h-[44px] flex items-center select-text">
                {speechRec.fullTranscript ? (
                  <p className="text-sm sm:text-base font-bold text-primary font-mono leading-relaxed">
                    {speechRec.fullTranscript}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/70 italic">
                    Hãy đọc to câu trên vào micro... chữ bạn nói sẽ xuất hiện ở đây theo thời gian thực.
                  </p>
                )}
              </div>

              {/* Low-Volume Warning */}
              {recorder.isTooQuiet && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-in fade-in-0 duration-150">
                  <span>⚠️ Âm lượng micro đang rất nhỏ — hãy đưa micro gần lại hoặc nói to hơn nhé!</span>
                </div>
              )}
            </div>
          )}

          {/* Evaluating State Preview */}
          {recordingStatus === "evaluating" && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 shadow-xs flex items-center gap-2.5 animate-in fade-in-0 duration-200">
              <Loader2 className="size-4 animate-spin text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  Đang phân tích ngữ âm & tính điểm phát âm...
                </p>
                {speechRec.fullTranscript && (
                  <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                    &ldquo;{speechRec.fullTranscript}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 2. Audio Comparison & Spoken Preview (Appears when user has recorded) */}
          {(userAudioUrl || spokenTranscript) && (
            <div className="p-3.5 rounded-2xl bg-card border border-primary/20 shadow-xs space-y-2.5 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Headphones className="size-3.5 text-primary" />
                  <span>Đối chiếu âm thanh</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePlayNative}
                    className="h-7 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80 hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Volume2 className="size-3 text-primary" />
                    <span>1. Giọng bản xứ</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePlayUserAudio}
                    disabled={!userAudioUrl}
                    className={cn(
                      "h-7 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80 transition-all cursor-pointer",
                      isPlayingUserAudio
                        ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/50 shadow-xs animate-pulse"
                        : "hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                    )}
                  >
                    {isPlayingUserAudio ? (
                      <Square className="size-3 fill-current text-indigo-500" />
                    ) : (
                      <Headphones className="size-3 text-indigo-500" />
                    )}
                    <span>{isPlayingUserAudio ? "Dừng nghe" : "2. Nghe lại giọng bạn"}</span>
                  </Button>
                </div>
              </div>

              {/* Spoken Words Transcript Preview */}
              {spokenTranscript && (
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Những gì bạn vừa nói:</span>
                    {hasScore && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 lowercase font-medium">
                        ✓ {score.correctWords.length} từ khớp
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5 select-text">
                    {spokenTranscript
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((w, idx) => {
                        const cleanSpk = w.toLowerCase().replace(/[^\w']/g, "");
                        const isMatch =
                          hasScore &&
                          score.correctWords.some(
                            (cw) => cw.toLowerCase() === cleanSpk
                          );
                        return (
                          <span
                            key={idx}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-xs font-semibold font-mono border",
                              isMatch
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            )}
                          >
                            {w}
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Compact Score Summary Card */}
          {hasScore ? (
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between gap-3 animate-in fade-in-0 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "size-12 rounded-2xl flex items-center justify-center font-black font-mono text-xl shadow-xs shrink-0",
                    scoreBg
                  )}
                >
                  {overallScore.toFixed(0)}
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="font-bold text-xs text-foreground truncate">
                    {score.coachRemarkVi ||
                      (overallScore >= 85
                        ? "Phát âm rất chuẩn xác!"
                        : overallScore >= 65
                        ? "Khá tốt, hãy giữ vững nhịp điệu!"
                        : "Cần luyện tập phát âm thêm.")}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-mono text-muted-foreground border border-border/40">
                      Chính xác:{" "}
                      <b className="text-emerald-600 dark:text-emerald-400">
                        {score.accuracy.toFixed(0)}%
                      </b>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-mono text-muted-foreground border border-border/40">
                      Lưu loát:{" "}
                      <b className="text-sky-600 dark:text-sky-400">
                        {score.fluency.toFixed(0)}%
                      </b>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-mono text-muted-foreground border border-border/40">
                      Hoàn thiện:{" "}
                      <b className="text-purple-600 dark:text-purple-400">
                        {score.completeness.toFixed(0)}%
                      </b>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/50 text-center py-4 text-xs text-muted-foreground space-y-1">
              <Sparkles className="size-4 text-primary mx-auto opacity-70" />
              <p className="font-medium text-foreground">Sẵn sàng kiểm tra phát âm</p>
              <p className="text-[11px]">
                Bấm nút <b>Kiểm tra phát âm</b> (hoặc nhấn <b>Enter</b>) để thu âm câu trên.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer: Main Action Toolbar ── */}
        <div className="p-3 sm:p-3.5 border-t border-border/60 bg-muted/15 shrink-0 flex items-center justify-between gap-2.5">
          <Button
            variant="outline"
            size="default"
            onClick={handlePlayNative}
            className="h-10 px-3 sm:px-4 rounded-xl font-bold text-xs border-border/80 flex items-center gap-1.5 hover:bg-muted/50 shrink-0"
            title="Nghe phát lại câu này (Space)"
          >
            <Play className="size-3.5 fill-current text-muted-foreground" />
            <span className="hidden sm:inline">Phát lại</span>
            <kbd className="text-[9px] font-mono px-1 py-0.5 bg-muted rounded text-muted-foreground">
              space
            </kbd>
          </Button>

          <Button
            size="default"
            onClick={recordingStatus === "recording" ? handleStopRecord : handleStartRecord}
            disabled={recordingStatus === "evaluating"}
            className={cn(
              "h-10 px-4 sm:px-6 rounded-xl font-black text-xs sm:text-sm flex-1 flex items-center justify-center gap-2 text-white shadow-md transition-all cursor-pointer",
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
                <kbd className="text-[9px] font-mono px-1.5 py-0.5 bg-white/20 rounded ml-1">
                  enter
                </kbd>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={handleNextSegment}
            disabled={activeSegmentIndex === activeLesson.segments.length - 1}
            className="h-10 px-3 sm:px-4 rounded-xl font-bold text-xs border-border/80 flex items-center gap-1 hover:bg-muted/50 shrink-0"
            title="Sang câu tiếp theo (→)"
          >
            <span className="hidden sm:inline">Tiếp</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-background select-none",
        currentView === "studio" ? "h-full overflow-hidden" : "min-h-full"
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
              <Link href="/">
                <Button variant="ghost" size="sm" className="size-8 p-0 rounded-xl" title="Quay lại Trang chủ">
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
          VIEW 2: STUDIO PLAYER (PHÒNG LUYỆN SHADOWING & PHÁT ÂM - ZERO-SCROLL)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentView === "studio" && (
        <>
          {/* ── STUDIO TOP NAV BAR (Compact 44px) ── */}
          <header className="h-11 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
            {/* Left: Back to Hub + Video Title + Add Video */}
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("hub")}
                className="h-7 px-2 rounded-lg text-xs font-bold gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                title="Quay về Màn Chính (Hub)"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Màn chính</span>
              </Button>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-foreground truncate max-w-[140px] sm:max-w-[260px] md:max-w-[380px]">
                  {activeLesson.title}
                </h1>
              </div>

              {/* Add YouTube Video Button in Studio */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddVideoModal(true)}
                className="h-7 px-2 rounded-lg text-xs font-semibold gap-1 border-border/80 text-muted-foreground hover:text-primary hover:border-primary/40 shrink-0 hidden md:flex"
                title="Dán link nạp video YouTube mới"
              >
                <PlusCircle className="size-3" />
                <span>Nạp video khác</span>
              </Button>
            </div>

            {/* Right: Theme Toggle + Mode Tabs [Shadowing] [Phát âm] */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleTheme}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Đổi giao diện Sáng / Tối"
                aria-label="Đổi giao diện Sáng / Tối"
              >
                {isDarkMode ? <Sun className="size-3.5 text-amber-500" /> : <Moon className="size-3.5" />}
              </Button>

              <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60">
                <button
                  onClick={() => {
                    if (isPlayingVideo) pauseVideo();
                    if (recordingStatus === "recording") {
                      speechRec.stopListening();
                      speechRec.resetTranscript();
                      recorder.stop().catch(() => {});
                      setRecordingStatus("idle");
                    }
                    if (userAudioRef.current) {
                      userAudioRef.current.pause();
                      setIsPlayingUserAudio(false);
                    }
                    setActiveMode("shadowing");
                  }}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1",
                    activeMode === "shadowing"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Shadowing</span>
                </button>

                <button
                  onClick={() => {
                    if (isPlayingVideo) pauseVideo();
                    if (shadowingRecordStatus === "recording") {
                      speechRec.stopListening();
                      speechRec.resetTranscript();
                      recorder.stop().catch(() => {});
                      setShadowingRecordStatus("idle");
                    }
                    if (shadowingAudioRef.current) {
                      shadowingAudioRef.current.pause();
                      setIsPlayingShadowingAudio(false);
                    }
                    setActiveMode("pronounce");
                  }}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1",
                    activeMode === "pronounce"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Phát âm</span>
                </button>
              </div>
            </div>
          </header>

          {/* ── PERSISTENT STUDIO WORKSPACE (Zero-Scroll Single Grid) ── */}
          <main className="flex-1 p-1.5 sm:p-2.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 min-h-0">
            {/* LEFT COLUMN: 8 cols in Shadowing, 6 cols in Pronounce */}
            <div
              className={cn(
                "h-full flex flex-col gap-1.5 min-h-0 overflow-hidden",
                activeMode === "shadowing" ? "lg:col-span-8" : "lg:col-span-6 gap-2"
              )}
            >
              {/* Persistent Video Player Container - Max-height constrained for Zero-Scroll */}
              <div
                ref={playerContainerRef}
                className={cn(
                  "shrink-0 aspect-video w-full max-h-[44vh] sm:max-h-[48vh] mx-auto rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-border/80 shadow-md relative",
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
              setShadowingAudioUrl(null);
              if (shadowingAudioRef.current) {
                shadowingAudioRef.current.pause();
                shadowingAudioRef.current = null;
              }
              setIsPlayingShadowingAudio(false);
              setShadowingRecordStatus("idle");
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
