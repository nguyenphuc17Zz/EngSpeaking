"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { WordLookupPopup, type VocabWord } from "@/components/foundation/shadowing/WordLookupPopup";
import {
  computeShadowingScore,
  type ShadowingScoreResult,
} from "@/lib/foundation/shadowing/pronunciation-scorer";
import {
  type CorodomoVideoLesson,
  type CorodomoSegment,
  extractYouTubeVideoId,
} from "@/lib/foundation/shadowing/corodomo-presets";
import {
  getSentenceWordsWithIpa,
  type WordIpaToken,
  getWordIpa,
} from "@/lib/foundation/shadowing/ipa-dictionary";
import {
  addVideoToLibrary,
  updateVideoInLibrary,
} from "@/lib/foundation/shadowing/shadowing-library.service";
import {
  saveTranscript,
  getTranscript,
} from "@/lib/foundation/shadowing/shadowing-transcript-db.service";
import {
  getVideoProgress,
  saveVideoProgress,
  resetVideoProgress,
  formatPlaybackTime,
} from "@/lib/foundation/shadowing/shadowing-progress.service";
import {
  lookupLexiconWord,
  formatConciseMeaning,
  formatPartOfSpeech,
  fetchDictionaryDefinition,
} from "@/lib/foundation/vocabulary/lexicon-db.service";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { mergeFragmentedSegments } from "@/lib/foundation/shadowing/transcript-stitcher";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  X,
  Loader2,
  Volume2,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Languages,
  Mic,
  MicOff,
  Repeat1,
  PauseCircle,
  Headphones,
  Square,
  Keyboard,
  Video,
  ChevronDown,
  ChevronUp,
  Layers,
  RefreshCw,
  RotateCcw,
  Sun,
  Moon,
  LocateFixed,
  PlusCircle,
} from "lucide-react";

export type ShadowingPlayMode = "continuous" | "pause_after_sentence" | "loop_sentence";
export type StudioMode = "shadowing" | "pronounce";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface ShadowingStudioEngineProps {
  initialLesson: CorodomoVideoLesson;
  onBackToHub: () => void;
  onLessonUpdated?: (updated: CorodomoVideoLesson) => void;
  onNavigateToVideo?: (videoId: string) => void;
}

export function ShadowingStudioEngine({
  initialLesson,
  onBackToHub,
  onLessonUpdated,
  onNavigateToVideo,
}: ShadowingStudioEngineProps) {
  const setHideAppHeader = useUiStore((s) => s.setHideAppHeader);

  // Keep global app header hidden when in immersive studio
  useEffect(() => {
    setHideAppHeader(true);
    return () => setHideAppHeader(false);
  }, [setHideAppHeader]);

  const [activeMode, setActiveMode] = useState<StudioMode>("shadowing");
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

  const [activeLesson, setActiveLesson] = useState<CorodomoVideoLesson>(() => {
    const rawSegments = initialLesson.segments || [];
    const healed = mergeFragmentedSegments(rawSegments).map((s, idx) => ({
      ...s,
      segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
    })) as CorodomoSegment[];
    return {
      ...initialLesson,
      segments: healed,
    };
  });
  const activeLessonRef = useRef(activeLesson);
  activeLessonRef.current = activeLesson;

  // Sync if initialLesson changes externally (protecting against stale empty overwrite)
  useEffect(() => {
    if (
      activeLessonRef.current?.youtubeId === initialLesson.youtubeId &&
      (activeLessonRef.current?.segments?.length || 0) > 0 &&
      (!initialLesson.segments || initialLesson.segments.length === 0)
    ) {
      return;
    }

    const rawSegments = initialLesson.segments || [];
    const healed = mergeFragmentedSegments(rawSegments).map((s, idx) => ({
      ...s,
      segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
    })) as CorodomoSegment[];
    setActiveLesson({
      ...initialLesson,
      segments: healed,
    });
  }, [initialLesson]);

  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const activeSegmentIndexRef = useRef(activeSegmentIndex);
  activeSegmentIndexRef.current = activeSegmentIndex;

  const initialResumeTimeRef = useRef<number>(0);
  const lastSavedProgressTimeRef = useRef<number>(0);

  // Auto-heal fragmented segments
  useEffect(() => {
    if (!activeLesson?.segments || activeLesson.segments.length <= 1) return;
    const healed = mergeFragmentedSegments(activeLesson.segments).map((s, idx) => ({
      ...s,
      segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
    })) as CorodomoSegment[];
    if (healed.length !== activeLesson.segments.length) {
      setActiveLesson((prev) => ({
        ...prev,
        segments: healed,
      }));
    }
  }, [activeLesson?.id]);

  // ─── Playback & Sync State ───────────────────────────────────────────
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const playbackSpeedRef = useRef<number>(1.0);
  playbackSpeedRef.current = playbackSpeed;
  const [playMode, setPlayMode] = useState<ShadowingPlayMode>("continuous");
  const playModeRef = useRef<ShadowingPlayMode>("continuous");
  playModeRef.current = playMode;

  const justPausedSegRef = useRef<number>(-1);
  const isAutoPausingRef = useRef<boolean>(false);
  const isLoopSeekingRef = useRef<boolean>(false);
  const seekGraceUntilRef = useRef<number>(0);
  const seekTargetTimeRef = useRef<number>(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const seekToSegmentRef = useRef<(index: number, autoPlay?: boolean) => void>(() => {});

  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoHidden, setIsVideoHidden] = useState(false);

  // ─── Subtitle Toggles ────────────────────────────────────────────────
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

  // ─── Subtitle Lead-time Sync Offset ──────────────────────────────────
  const [subtitleSyncOffset, setSubtitleSyncOffset] = useState<number>(0.35);
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
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [modalUrlInput, setModalUrlInput] = useState("");
  const [isLoadingCustomUrl, setIsLoadingCustomUrl] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showSubtitleAccordion, setShowSubtitleAccordion] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  // ─── Corner Resume Prompt State ─────────────────────────────────────
  const [cornerResumePrompt, setCornerResumePrompt] = useState<{
    segmentIndex: number;
    totalSegments: number;
    currentTime: number;
  } | null>(null);

  // Check initial progress for resume prompt on mount
  useEffect(() => {
    if (activeLesson?.youtubeId && activeLesson.youtubeId !== "custom") {
      const progress = getVideoProgress(activeLesson.youtubeId);
      if (progress && (progress.currentTime > 2 || progress.segmentIndex > 0)) {
        const segs = activeLesson.segments || [];
        const lastSeg = segs[segs.length - 1];
        const isAtEnd = lastSeg && progress.currentTime >= lastSeg.end_time - 1;
        if (!isAtEnd) {
          const savedIdx = Math.min(progress.segmentIndex, Math.max(0, segs.length - 1));
          setCornerResumePrompt({
            segmentIndex: savedIdx,
            totalSegments: segs.length,
            currentTime: progress.currentTime,
          });
        }
      }
    }
  }, [activeLesson?.youtubeId]);

  // ─── Word Lookup Popup State ─────────────────────────────────────────
  const [popupWord, setPopupWord] = useState<VocabWord | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPopupWord(null);
    setPopupAnchor(null);
  }, [activeSegmentIndex]);

  // ─── Refs ────────────────────────────────────────────────────────────
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineItemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const accordionItemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const accordionContainerRef = useRef<HTMLDivElement | null>(null);
  const autoPauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subtitle Auto-Scroll & Gesture Navigation
  const [isDetachedFromActive, setIsDetachedFromActive] = useState(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedTimeRef = useRef<number>(0);
  const isSeekingJumpRef = useRef<boolean>(false);

  // Focus Reclaiming
  const reclaimFocus = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (document.activeElement && document.activeElement.tagName === "IFRAME") {
        (document.activeElement as HTMLElement).blur?.();
      }
      window.focus();
      if (document.body && typeof document.body.focus === "function") {
        document.body.focus();
      }
    } catch {}
  }, []);
  const reclaimFocusRef = useRef(reclaimFocus);
  reclaimFocusRef.current = reclaimFocus;

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Speech & Audio Hooks ────────────────────────────────────────────
  const tts = useBrowserTTS();
  const recorder = useAudioRecorder();
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  const speechRec = useSpeechRecognition("en-US");
  const speechRecRef = useRef(speechRec);
  speechRecRef.current = speechRec;
  const currentVideoIdRef = useRef<string | null>(null);

  const currentSegment: CorodomoSegment =
    activeLesson?.segments?.[activeSegmentIndex] ||
    activeLesson?.segments?.[0] || {
      segment_id: "seg_empty",
      text: "",
      start_time: 0,
      end_time: 0,
      translationVi: "",
      thoughtGroups: "",
    };

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

  // ─── Initialize YouTube Player ────────────────────────────────────────
  const initYouTubePlayer = useCallback(
    (videoId: string) => {
      if (typeof window === "undefined") return;

      const createPlayer = () => {
        if (
          playerRef.current &&
          currentVideoIdRef.current === videoId &&
          document.getElementById("corodomo-yt-player")
        ) {
          if (initialResumeTimeRef.current > 0) {
            const resumeTime = initialResumeTimeRef.current;
            initialResumeTimeRef.current = 0;
            try {
              playerRef.current.seekTo(resumeTime, false);
            } catch {}
          }
          return;
        }

        if (
          playerRef.current &&
          typeof playerRef.current.loadVideoById === "function" &&
          document.getElementById("corodomo-yt-player")
        ) {
          try {
            currentVideoIdRef.current = videoId;
            const resumeTime = initialResumeTimeRef.current;
            initialResumeTimeRef.current = 0;
            if (typeof playerRef.current.cueVideoById === "function") {
              playerRef.current.cueVideoById({
                videoId,
                startSeconds: resumeTime || 0,
              });
            } else {
              playerRef.current.loadVideoById({
                videoId,
                startSeconds: resumeTime || 0,
              });
            }
            playerRef.current.setPlaybackRate(playbackSpeed);
            return;
          } catch {}
        }

        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {}
          playerRef.current = null;
        }

        const container = playerContainerRef.current;
        if (!container || !window.YT || !window.YT.Player) return;

        let el = container.querySelector("#corodomo-yt-player") as HTMLElement | null;
        if (!el) {
          el = document.createElement("div");
          el.id = "corodomo-yt-player";
          el.className = "w-full h-full absolute inset-0";
          container.appendChild(el);
        }

        currentVideoIdRef.current = videoId;
        const resumeTime = initialResumeTimeRef.current;
        playerRef.current = new window.YT.Player(el, {
          videoId,
          host: "https://www.youtube.com",
          playerVars: {
            enablejsapi: 1,
            disablekb: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            playsinline: 1,
            start: resumeTime > 0 ? Math.floor(resumeTime) : undefined,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          },
          events: {
            onReady: () => {
              playerRef.current?.setPlaybackRate(playbackSpeed);
              if (initialResumeTimeRef.current > 0) {
                const t = initialResumeTimeRef.current;
                initialResumeTimeRef.current = 0;
                try {
                  playerRef.current?.seekTo(t, false);
                } catch {}
              }
            },
            onStateChange: (event: any) => {
              setTimeout(() => {
                reclaimFocusRef.current?.();
              }, 80);

              if (event.data === 3) {
                isSeekingJumpRef.current = true;
              } else if (event.data === 1) {
                if (
                  isAutoPausingRef.current ||
                  (playModeRef.current === "pause_after_sentence" && justPausedSegRef.current !== -1)
                ) {
                  try {
                    playerRef.current?.pauseVideo();
                  } catch {}
                  return;
                }
                setIsPlayingVideo(true);
              } else if (event.data === 2 || event.data === 0) {
                isAutoPausingRef.current = false;
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
    [playbackSpeed]
  );

  useEffect(() => {
    if (activeLesson?.youtubeId) {
      initYouTubePlayer(activeLesson.youtubeId);
    }
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
        currentVideoIdRef.current = null;
      }
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
      if (shadowingAudioRef.current) {
        shadowingAudioRef.current.pause();
        shadowingAudioRef.current = null;
      }
      try {
        recorderRef.current?.cancel();
      } catch {}
      speechRecRef.current?.stopListening();
    };
  }, [activeLesson?.youtubeId, initYouTubePlayer]);

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

    if (activeLessonRef.current?.youtubeId && activeLessonRef.current.youtubeId !== "custom") {
      let curTime = 0;
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        try {
          const t = playerRef.current.getCurrentTime();
          if (typeof t === "number" && !isNaN(t)) curTime = t;
        } catch {}
      }
      if (curTime > 0) {
        saveVideoProgress(activeLessonRef.current.youtubeId, {
          currentTime: curTime,
          segmentIndex: activeSegmentIndexRef.current,
        });
      }
    }
  }, []);

  // ─── High-Precision Sentence Synchronization Loop ────────────────────
  useEffect(() => {
    let animId: number;
    let lastTimeCheck = 0;

    const syncLoop = () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const now = performance.now();
        if (now - lastTimeCheck > 25) {
          lastTimeCheck = now;
          try {
            const time = playerRef.current.getCurrentTime();
            if (typeof time === "number" && !isNaN(time)) {
              if (Date.now() < seekGraceUntilRef.current) {
                const target = seekTargetTimeRef.current;
                const isNearTarget = Math.abs(time - target) <= 0.6 || time >= target - 0.2;
                if (!isNearTarget) {
                  animId = requestAnimationFrame(syncLoop);
                  return;
                }
              }

              if (lastReportedTimeRef.current > 0) {
                const timeDelta = Math.abs(time - lastReportedTimeRef.current);
                if (timeDelta > 1.0) {
                  isSeekingJumpRef.current = true;
                }
              }
              lastReportedTimeRef.current = time;
              setCurrentTime(time);

              // Periodic progress auto-save
              const wallNow = Date.now();
              if (
                activeLessonRef.current?.youtubeId &&
                activeLessonRef.current.youtubeId !== "custom" &&
                wallNow - lastSavedProgressTimeRef.current > 2500
              ) {
                lastSavedProgressTimeRef.current = wallNow;
                saveVideoProgress(activeLessonRef.current.youtubeId, {
                  currentTime: time,
                  segmentIndex: activeSegmentIndexRef.current,
                });
              }

              const segments = activeLesson.segments;
              if (segments.length > 0) {
                const curIdx = activeSegmentIndexRef.current;
                const currentSeg = segments[curIdx];

                // 1. Loop sentence mode
                if (playModeRef.current === "loop_sentence" && currentSeg) {
                  const loopThreshold = currentSeg.end_time - 0.15;
                  if (time >= loopThreshold) {
                    if (!isLoopSeekingRef.current) {
                      isLoopSeekingRef.current = true;
                      seekGraceUntilRef.current = Date.now() + 500;
                      seekTargetTimeRef.current = currentSeg.start_time;
                      try {
                        playerRef.current?.seekTo(currentSeg.start_time, true);
                      } catch {}
                      setTimeout(() => {
                        isLoopSeekingRef.current = false;
                      }, 400);
                    }
                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }
                }

                // 2. Pause after sentence mode
                if (playModeRef.current === "pause_after_sentence" && currentSeg) {
                  const endThreshold = currentSeg.end_time - 0.15;
                  if (time >= endThreshold && justPausedSegRef.current !== curIdx) {
                    justPausedSegRef.current = curIdx;
                    isAutoPausingRef.current = true;
                    try {
                      playerRef.current?.pauseVideo();
                    } catch {}
                    setIsPlayingVideo(false);
                    setIsAutoPaused(true);
                    toast.info("Tạm dừng", "Nhấn Phím Cách (Space) để học tiếp");
                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }
                }

                // 3. Continuous sync
                const compTime = time + subtitleSyncOffsetRef.current;
                const currentStillMatches =
                  currentSeg &&
                  compTime >= currentSeg.start_time - 0.1 &&
                  compTime <= currentSeg.end_time + 0.15;

                if (!currentStillMatches) {
                  const foundIdx = segments.findIndex((s, idx) => {
                    const nextSeg = segments[idx + 1];
                    const effectiveEnd = nextSeg ? Math.min(s.end_time + 0.35, nextSeg.start_time) : s.end_time + 0.5;
                    return compTime >= s.start_time && compTime < effectiveEnd;
                  });

                  if (foundIdx !== -1 && foundIdx !== curIdx) {
                    setActiveSegmentIndex(foundIdx);
                    activeSegmentIndexRef.current = foundIdx;
                    if (playModeRef.current === "pause_after_sentence" && justPausedSegRef.current !== foundIdx) {
                      justPausedSegRef.current = -1;
                    }
                  }
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
  }, [activeLesson.segments]);

  // ─── Seek to Segment ─────────────────────────────────────────────────
  const seekToSegment = useCallback(
    (index: number, autoPlay = true) => {
      const seg = activeLesson?.segments?.[index];
      if (!seg) return;

      if (autoPauseTimerRef.current) {
        clearTimeout(autoPauseTimerRef.current);
        autoPauseTimerRef.current = null;
      }

      justPausedSegRef.current = -1;
      isAutoPausingRef.current = false;
      setIsAutoPaused(false);
      setActiveSegmentIndex(index);
      activeSegmentIndexRef.current = index;
      setIsDetachedFromActive(false);

      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        seekGraceUntilRef.current = Date.now() + 800;
        seekTargetTimeRef.current = seg.start_time;
        isSeekingJumpRef.current = true;
        try {
          playerRef.current.seekTo(seg.start_time, true);
        } catch {}
        if (autoPlay) {
          try {
            playerRef.current.playVideo();
          } catch {}
          setIsPlayingVideo(true);
        }
      }

      // Save progress
      if (activeLessonRef.current?.youtubeId && activeLessonRef.current.youtubeId !== "custom") {
        saveVideoProgress(activeLessonRef.current.youtubeId, {
          currentTime: seg.start_time,
          segmentIndex: index,
        });
      }
    },
    [activeLesson?.segments]
  );
  seekToSegmentRef.current = seekToSegment;

  const handleRestartFromBeginning = useCallback((youtubeId?: string) => {
    const targetId = youtubeId || activeLessonRef.current?.youtubeId;
    if (targetId) {
      resetVideoProgress(targetId);
    }
    initialResumeTimeRef.current = 0;
    seekGraceUntilRef.current = Date.now() + 600;
    seekToSegment(0, false);
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(0, true);
    }
    toast.success("Đã quay về đầu video", "Bắt đầu học lại từ câu 1.");
  }, [seekToSegment]);

  const handleConfirmResume = useCallback(() => {
    if (!cornerResumePrompt) return;
    seekToSegment(cornerResumePrompt.segmentIndex, false);
    setCornerResumePrompt(null);
    toast.info(
      "Tiếp tục bài học",
      `Tiếp tục học từ câu ${cornerResumePrompt.segmentIndex + 1}/${cornerResumePrompt.totalSegments}`
    );
  }, [cornerResumePrompt, seekToSegment]);

  const handleDismissResume = useCallback(() => {
    if (activeLessonRef.current?.youtubeId) {
      resetVideoProgress(activeLessonRef.current.youtubeId);
    }
    seekToSegment(0, false);
    setCornerResumePrompt(null);
  }, [seekToSegment]);

  const handleCloseResumeBanner = useCallback(() => {
    setCornerResumePrompt(null);
  }, []);

  // ─── Resync Captions from YouTube & Auto-Fetch Engine ───────────────
  const [isResyncing, setIsResyncing] = useState(false);
  const handleResyncCaptions = useCallback(
    async (youtubeIdOverride?: string) => {
      const targetYoutubeId = youtubeIdOverride || activeLessonRef.current.youtubeId;
      if (!targetYoutubeId || targetYoutubeId === "custom" || targetYoutubeId.length !== 11) {
        toast.error("Không thể đồng bộ", "Chỉ hỗ trợ video YouTube hợp lệ.");
        return;
      }
      setIsResyncing(true);
      toast.info("Đang đồng bộ phụ đề...", "Đang tải lại mốc thời gian chuẩn xác nhất từ YouTube.");
      try {
        const res = await fetch("/api/shadowing/youtube-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${targetYoutubeId}` }),
        });
        const data = await res.json();
        if (!res.ok || !data.segments || data.segments.length === 0) {
          throw new Error(data.error || "Không tìm thấy phụ đề mới từ YouTube.");
        }
        const healed: CorodomoSegment[] = mergeFragmentedSegments(
          data.segments.map((s: any, idx: number) => ({
            segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
            text: s.text,
            start_time: s.start_time,
            end_time: s.end_time,
            translationVi: s.translationVi || "",
            thoughtGroups: s.thoughtGroups || s.text,
            ipa: s.ipa || "",
            wordsWithIpa: s.wordsWithIpa,
          }))
        ).map((s, idx) => ({
          ...s,
          segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
        })) as CorodomoSegment[];

        await saveTranscript(targetYoutubeId, healed);
        const updatedLesson: CorodomoVideoLesson = {
          ...activeLessonRef.current,
          title: data.title || activeLessonRef.current.title,
          segments: healed,
        };
        setActiveLesson(updatedLesson);
        updateVideoInLibrary(activeLessonRef.current.id, {
          title: updatedLesson.title,
          segments: healed,
        });
        onLessonUpdated?.(updatedLesson);
        toast.success("Đồng bộ phụ đề thành công!", `Đã cập nhật ${healed.length} câu phụ đề chuẩn xác.`);
      } catch (err: unknown) {
        toast.error("Lỗi đồng bộ phụ đề", err instanceof Error ? err.message : String(err));
      } finally {
        setIsResyncing(false);
      }
    },
    [onLessonUpdated]
  );

  // Auto-fetch or restore transcript from IndexedDB if segments are empty
  const isAutoFetchingRef = useRef(false);
  useEffect(() => {
    if (
      activeLesson?.youtubeId &&
      (!activeLesson.segments || activeLesson.segments.length === 0)
    ) {
      getTranscript(activeLesson.youtubeId).then(async (dbSegments) => {
        if (dbSegments && dbSegments.length > 0) {
          const healed = mergeFragmentedSegments(dbSegments).map((s, idx) => ({
            ...s,
            segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
          })) as CorodomoSegment[];
          const resolvedLesson: CorodomoVideoLesson = {
            ...activeLessonRef.current,
            segments: healed,
          };
          setActiveLesson(resolvedLesson);
          onLessonUpdated?.(resolvedLesson);
        } else if (
          !isAutoFetchingRef.current &&
          activeLesson.youtubeId !== "custom" &&
          (activeLesson.youtubeId.length === 11 || activeLesson.youtubeId.length >= 5)
        ) {
          isAutoFetchingRef.current = true;
          try {
            await handleResyncCaptions(activeLesson.youtubeId);
          } finally {
            isAutoFetchingRef.current = false;
          }
        }
      });
    }
  }, [activeLesson?.id, activeLesson?.youtubeId, handleResyncCaptions, onLessonUpdated]);

  // ─── Playback Controls ───────────────────────────────────────────────
  const handleTogglePlayVideo = useCallback(() => {
    reclaimFocus();
    if (isPlayingVideo) {
      pauseVideo();
    } else {
      justPausedSegRef.current = -1;
      isAutoPausingRef.current = false;
      setIsAutoPaused(false);
      playVideo();
    }
  }, [isPlayingVideo, pauseVideo, playVideo, reclaimFocus]);

  const handleChangePlaybackSpeed = useCallback((newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    playbackSpeedRef.current = newSpeed;
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === "function") {
      try {
        playerRef.current.setPlaybackRate(newSpeed);
      } catch {}
    }
    toast.info("Tốc độ phát", `${newSpeed}x`);
  }, []);

  const handleSelectPlayMode = useCallback((mode: ShadowingPlayMode) => {
    setPlayMode(mode);
    playModeRef.current = mode;
    justPausedSegRef.current = -1;
    isAutoPausingRef.current = false;
    setIsAutoPaused(false);
  }, []);

  const cyclePlayMode = useCallback(() => {
    setPlayMode((prev) => {
      let next: ShadowingPlayMode = "continuous";
      if (prev === "continuous") next = "pause_after_sentence";
      else if (prev === "pause_after_sentence") next = "loop_sentence";
      else next = "continuous";

      playModeRef.current = next;
      justPausedSegRef.current = -1;
      isAutoPausingRef.current = false;
      setIsAutoPaused(false);

      if (next === "continuous") {
        toast.info("Chế độ phát", "▶ Phát liên tục");
      } else if (next === "pause_after_sentence") {
        toast.info("Chế độ phát", "⏸ Dừng sau mỗi câu");
      } else {
        toast.info("Chế độ phát", "🔁 Lặp lại câu hiện tại");
      }
      return next;
    });
  }, []);

  const handleNextSegment = useCallback(() => {
    reclaimFocus();
    const cur = activeSegmentIndexRef.current;
    const total = activeLesson?.segments?.length || 0;
    if (cur < total - 1) {
      seekToSegment(cur + 1, isPlayingVideo);
    } else {
      setShowCompletedModal(true);
      triggerConfetti();
    }
  }, [activeLesson?.segments?.length, isPlayingVideo, seekToSegment, reclaimFocus]);

  const handlePrevSegment = useCallback(() => {
    reclaimFocus();
    const cur = activeSegmentIndexRef.current;
    if (cur > 0) {
      seekToSegment(cur - 1, isPlayingVideo);
    }
  }, [isPlayingVideo, seekToSegment, reclaimFocus]);

  // ─── Recording & Scoring (Phát âm mode) ──────────────────────────────
  const handleStartRecord = useCallback(async () => {
    if (isPlayingVideo) pauseVideo();
    setScore(null);
    setUserAudioUrl(null);
    setSpokenTranscript("");
    setRecordingStatus("recording");
    setRecordingStartMs(Date.now());
    speechRec.resetTranscript();
    speechRec.startListening();
    await recorder.start();
  }, [isPlayingVideo, pauseVideo, recorder, speechRec]);

  const handleStopRecord = useCallback(async () => {
    setRecordingStatus("evaluating");
    speechRec.stopListening();
    const recording = await recorder.stop();

    if (!recording || !recording.blob || recording.blob.size === 0) {
      setRecordingStatus("idle");
      toast.error("Không thu được âm thanh", "Vui lòng kiểm tra lại micro của bạn.");
      return;
    }

    const audioBlob = recording.blob;
    const url = URL.createObjectURL(audioBlob);
    setUserAudioUrl(url);

    let recognizedText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
    const settings = useSettingsStore.getState();
    if (!recognizedText || recognizedText.length < 2 || settings.stt?.provider !== "browser") {
      try {
        const serverResult = await transcribeViaServer(audioBlob, {
          provider: settings.stt?.provider || "groq",
          model: settings.stt?.model || "whisper-large-v3-turbo",
          language: "en-US",
          prompt: currentSegment.text,
        });
        if (serverResult?.text) {
          recognizedText = serverResult.text.trim();
        }
      } catch {}
    }

    setSpokenTranscript(recognizedText);
    const targetText = currentSegment.text || "";
    const durationMs = recording.durationMs || Math.max(1000, Date.now() - recordingStartMs);
    const expectedDurMs = (currentSegment.end_time - currentSegment.start_time) * 1000;
    const result = computeShadowingScore(targetText, recognizedText, durationMs, expectedDurMs);
    setScore(result);
    setSentenceScores((prev) => ({
      ...prev,
      [currentSegment.segment_id]: result,
    }));

    if (result.overall >= 80) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
      toast.success(`Rất xuất sắc! ${result.overall}%`, "Phát âm rất chuẩn xác!");
    } else if (result.overall >= 60) {
      soundEffects.playAIReady();
      toast.info(`Khá tốt! ${result.overall}%`, "Chú ý một số âm vị chưa tròn vành.");
    } else {
      toast.error(`Cần cố gắng: ${result.overall}%`, "Hãy nghe lại câu mẫu và thử lại nhé.");
    }

    setRecordingStatus("idle");
  }, [currentSegment, recordingStartMs, recorder, speechRec]);

  const handlePlayNative = useCallback(() => {
    if (currentSegment?.text) {
      tts.speak(currentSegment.text);
    }
  }, [currentSegment?.text, tts]);

  const handleTogglePlayUserAudio = useCallback(() => {
    if (!userAudioUrl) return;
    if (isPlayingUserAudio) {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current.currentTime = 0;
      }
      setIsPlayingUserAudio(false);
    } else {
      if (!userAudioRef.current) {
        userAudioRef.current = new Audio(userAudioUrl);
        userAudioRef.current.onended = () => setIsPlayingUserAudio(false);
      } else {
        userAudioRef.current.src = userAudioUrl;
      }
      userAudioRef.current.play().catch(() => {});
      setIsPlayingUserAudio(true);
    }
  }, [isPlayingUserAudio, userAudioUrl]);

  // ─── Shadowing Record Preview ────────────────────────────────────────
  const handleToggleShadowingRecord = useCallback(async () => {
    if (shadowingRecordStatus === "recording") {
      speechRec.stopListening();
      const recording = await recorder.stop();
      setShadowingRecordStatus("idle");
      if (recording && recording.blob && recording.blob.size > 0) {
        const url = URL.createObjectURL(recording.blob);
        setShadowingAudioUrl(url);
        setShadowingTranscript(speechRec.fullTranscript.trim() || speechRec.transcript.trim());
        toast.success("Đã ghi lại giọng Shadowing", "Nhấn Play để nghe lại giọng bạn nhại âm!");
      }
    } else {
      setShadowingAudioUrl(null);
      setShadowingTranscript("");
      speechRec.resetTranscript();
      speechRec.startListening();
      await recorder.start();
      setShadowingRecordStatus("recording");
      toast.info("Đang thu giọng Shadowing...", "Nói đuổi song song cùng video");
    }
  }, [recorder, shadowingRecordStatus, speechRec]);

  const handleTogglePlayShadowingAudio = useCallback(() => {
    if (!shadowingAudioUrl) return;
    if (isPlayingShadowingAudio) {
      shadowingAudioRef.current?.pause();
      setIsPlayingShadowingAudio(false);
    } else {
      if (!shadowingAudioRef.current) {
        shadowingAudioRef.current = new Audio(shadowingAudioUrl);
        shadowingAudioRef.current.onended = () => setIsPlayingShadowingAudio(false);
      } else {
        shadowingAudioRef.current.src = shadowingAudioUrl;
      }
      shadowingAudioRef.current.play().catch(() => {});
      setIsPlayingShadowingAudio(true);
    }
  }, [isPlayingShadowingAudio, shadowingAudioUrl]);

  // ─── Keyboard Hotkeys ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space" || e.key === " ") {
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
      } else if (e.code === "Enter" || e.key === "Enter") {
        e.preventDefault();
        if (activeMode === "pronounce") {
          if (recordingStatus === "idle") {
            handleStartRecord();
          } else if (recordingStatus === "recording") {
            handleStopRecord();
          }
        } else {
          handleNextSegment();
        }
      } else if (e.code === "KeyR" || e.key === "r" || e.key === "R") {
        e.preventDefault();
        handlePlayNative();
      } else if (e.code === "ArrowLeft" || e.key === "ArrowLeft" || e.code === "BracketLeft") {
        e.preventDefault();
        handlePrevSegment();
      } else if (e.code === "ArrowRight" || e.key === "ArrowRight" || e.code === "BracketRight") {
        e.preventDefault();
        handleNextSegment();
      } else if ((e.code === "KeyM" || e.key === "m" || e.key === "M") && activeMode === "shadowing") {
        e.preventDefault();
        handleToggleShadowingRecord();
      } else if ((e.code === "KeyL" || e.key === "l" || e.key === "L") && activeMode === "shadowing") {
        e.preventDefault();
        cyclePlayMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeMode,
    recordingStatus,
    isPlayingVideo,
    handleStartRecord,
    handleStopRecord,
    handlePlayNative,
    handleTogglePlayVideo,
    handlePrevSegment,
    handleNextSegment,
    handleToggleShadowingRecord,
    cyclePlayMode,
  ]);

  // Multi-layer focus reclaiming
  useEffect(() => {
    const handleWindowFocus = () => reclaimFocusRef.current?.();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        reclaimFocusRef.current?.();
        setTimeout(() => reclaimFocusRef.current?.(), 150);
      }
    };
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (typeof document !== "undefined" && document.activeElement?.tagName === "IFRAME") {
          reclaimFocusRef.current?.();
        }
      }, 300);
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ─── Word Lookup Handler ─────────────────────────────────────────────
  const handleWordClick = async (word: string, e?: React.MouseEvent<HTMLElement>) => {
    pauseVideo();
    if (autoPauseTimerRef.current) {
      clearTimeout(autoPauseTimerRef.current);
      autoPauseTimerRef.current = null;
    }

    const clean = word.toLowerCase().replace(/[^\w']/g, "");
    if (!clean) return;
    const clickToken = Date.now();

    if (e?.currentTarget) {
      setPopupAnchor(e.currentTarget);
    } else {
      setPopupAnchor(document.body);
    }

    const lexiconMatch = lookupLexiconWord(clean);
    if (lexiconMatch) {
      const derivedIpa = getWordIpa(clean);
      const popupData: VocabWord = {
        word: lexiconMatch.word,
        ipa: lexiconMatch.ipaUS || lexiconMatch.ipaUK || (derivedIpa ? `/${derivedIpa}/` : ""),
        meaning: formatConciseMeaning(lexiconMatch.meaningVi),
        partOfSpeech: formatPartOfSpeech(lexiconMatch.partOfSpeech),
        contextSentence: currentSegment.text,
        cefrLevel: lexiconMatch.cefrLevel,
        isLoading: false,
        playToken: clickToken,
      };
      setPopupWord(popupData);
      return;
    }

    const initialIpa = getWordIpa(clean);
    const initialPopupData: VocabWord = {
      word: clean,
      ipa: initialIpa ? `/${initialIpa}/` : `/${clean}/`,
      meaning: "",
      partOfSpeech: "Từ vựng",
      contextSentence: currentSegment.text,
      cefrLevel: undefined,
      isLoading: true,
      playToken: clickToken,
    };
    setPopupWord(initialPopupData);

    const dictResult = await fetchDictionaryDefinition(clean);
    setPopupWord((prev) => {
      if (!prev || prev.word !== clean) return prev;
      if (dictResult && dictResult.found) {
        return {
          ...prev,
          ipa: dictResult.ipa || prev.ipa,
          meaning: dictResult.meaningVi,
          partOfSpeech: dictResult.partOfSpeech || "Từ vựng",
          isLoading: false,
        };
      }
      return {
        ...prev,
        meaning: `Từ tiếng Anh: ${clean}`,
        partOfSpeech: "Từ vựng",
        isLoading: false,
      };
    });
  };

  const handleSaveWordToDeck = (word: VocabWord) => {
    toast.success(`Đã lưu "${word.word}" vào sổ từ vựng!`);
  };

  // ─── Add Custom YouTube Video Modal Handler ──────────────────────────
  const handleLoadNewVideoFromModal = async () => {
    const videoId = extractYouTubeVideoId(modalUrlInput);
    if (!videoId) {
      toast.error("Link YouTube không hợp lệ", "Vui lòng nhập đường dẫn hoặc ID video YouTube 11 ký tự.");
      return;
    }

    setIsLoadingCustomUrl(true);
    toast.info("Đang tải phụ đề YouTube...", "Vui lòng chờ trong giây lát.");

    try {
      const res = await fetch("/api/shadowing/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: modalUrlInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.segments || data.segments.length === 0) {
        throw new Error(data.error || "Không tìm thấy phụ đề cho video này.");
      }

      const healed: CorodomoSegment[] = mergeFragmentedSegments(
        data.segments.map((s: any, idx: number) => ({
          segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
          text: s.text,
          start_time: s.start_time,
          end_time: s.end_time,
          translationVi: s.translationVi || "",
          thoughtGroups: s.thoughtGroups || s.text,
          ipa: s.ipa || "",
          wordsWithIpa: s.wordsWithIpa,
        }))
      ).map((s, idx) => ({
        ...s,
        segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
      })) as CorodomoSegment[];

      await saveTranscript(videoId, healed);
      const newLesson: CorodomoVideoLesson = {
        id: `custom_${videoId}`,
        youtubeId: videoId,
        title: data.title || `YouTube Video (${videoId})`,
        channel: data.channel || "YouTube",
        cefrLevel: "Custom",
        playlistName: data.channel || "YouTube",
        playlistId: `custom_pl_${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: data.duration || "10:00",
        publishedAt: data.publishedAt,
        segments: healed,
      };

      addVideoToLibrary(newLesson);
      setShowAddVideoModal(false);
      setModalUrlInput("");

      if (onNavigateToVideo) {
        onNavigateToVideo(videoId);
      } else {
        setActiveLesson(newLesson);
        setActiveSegmentIndex(0);
        seekToSegment(0, false);
      }
      toast.success("Nạp video thành công!", `Đã thêm vào bài học với ${healed.length} câu.`);
    } catch (err: unknown) {
      toast.error("Không thể lấy phụ đề", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingCustomUrl(false);
    }
  };

  // ─── Back to Hub ─────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    pauseVideo();
    if (activeLessonRef.current?.youtubeId && activeLessonRef.current.youtubeId !== "custom") {
      let curTime = 0;
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        try {
          const t = playerRef.current.getCurrentTime();
          if (typeof t === "number" && !isNaN(t)) curTime = t;
        } catch {}
      }
      const curIdx = activeSegmentIndexRef.current;
      if (curTime > 0 || curIdx > 0) {
        saveVideoProgress(activeLessonRef.current.youtubeId, {
          currentTime: curTime,
          segmentIndex: curIdx,
        });
      }
    }
    setCornerResumePrompt(null);
    onBackToHub();
  }, [onBackToHub, pauseVideo]);

  // ─── Transcript Downloads & Copying ──────────────────────────────────
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

  // ─── Sidebar Filtering & Auto-scroll ─────────────────────────────────
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

  const handleUserWheelOrTouch = useCallback(() => {
    setIsDetachedFromActive(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsDetachedFromActive(false);
    }, 4000);
  }, []);

  const handleContainerScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    setIsDetachedFromActive(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsDetachedFromActive(false);
    }, 4000);
  }, []);

  const handleResumeAutoScroll = useCallback(() => {
    setIsDetachedFromActive(false);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    const el = timelineItemRefs.current[activeSegmentIndex];
    if (el && timelineContainerRef.current) {
      isProgrammaticScrollRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  }, [activeSegmentIndex]);

  useEffect(() => {
    if (isDetachedFromActive) return;
    const el = timelineItemRefs.current[activeSegmentIndex];
    if (el && timelineContainerRef.current) {
      isProgrammaticScrollRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 400);
    }
  }, [activeSegmentIndex, isDetachedFromActive]);

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
        {/* Subtitle Pill & Translation Area */}
        <div className="shrink-0 flex flex-col items-center justify-center px-2 py-1 text-center select-text min-h-[64px]">
          {activeLesson.segments.length === 0 ? (
            <div className="inline-flex items-center gap-2 bg-muted/70 text-muted-foreground px-4 py-2 rounded-xl border border-border/60 text-xs">
              {isResyncing ? (
                <>
                  <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                  <span className="font-semibold text-foreground">Đang tự động tải phụ đề tiếng Anh từ YouTube...</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">Chưa có dữ liệu phụ đề cho video này</span>
                  {activeLesson.youtubeId && activeLesson.youtubeId !== "custom" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResyncCaptions()}
                      className="h-6 px-2 text-[11px] font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className="size-3 mr-1" />
                      Tải phụ đề
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}

          {/* Listen & Repeat Status Banner */}
          {playMode === "pause_after_sentence" && (justPausedSegRef.current === activeSegmentIndex || isAutoPaused) && !isPlayingVideo && (
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-in fade-in-0 zoom-in-95 shadow-xs">
              <PauseCircle className="size-3.5 animate-pulse shrink-0" />
              <span>Đã dừng cuối câu • Bấm phím [→] hoặc [Enter] để sang câu sau • Bấm [Space] để nghe lại</span>
            </div>
          )}

          {/* Loop 1 Sentence Paused Status Banner */}
          {playMode === "loop_sentence" && !isPlayingVideo && (
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold animate-in fade-in-0 zoom-in-95 shadow-xs">
              <Repeat1 className="size-3.5 animate-pulse shrink-0" />
              <span>Đang tạm dừng • Bấm phím [→] hoặc [Enter] để sang câu sau • Bấm [Space] để tiếp tục lặp</span>
            </div>
          )}
        </div>

        {/* ── Speech Preview in Shadowing Mode ── */}
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

              {/* Volume Meter */}
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

            {recorder.isTooQuiet && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-in fade-in-0 duration-150">
                <span>⚠️ Âm lượng micro đang rất nhỏ — hãy đưa micro gần lại hoặc nói to hơn nhé!</span>
              </div>
            )}
          </div>
        )}

        {/* Finished Speech Preview */}
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

        {/* Video Controls Bar */}
        <div className="shrink-0 px-2.5 py-1.5 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-1.5 shadow-2xs">
          {/* Left: Toggles */}
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

            {/* Sync calibration */}
            <div className="hidden sm:flex items-center gap-1 pl-1.5 border-l border-border/50">
              <span className="text-[10px] font-mono font-bold text-muted-foreground select-none">
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
              disabled={activeLesson.segments.length === 0 || activeSegmentIndex === 0}
              className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Câu trước (←)"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <span className="text-xs font-mono font-bold text-foreground px-1.5 select-none">
              {activeLesson.segments.length > 0
                ? `${activeSegmentIndex + 1} / ${activeLesson.segments.length}`
                : "0 / 0"}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextSegment}
              disabled={activeLesson.segments.length === 0 || activeSegmentIndex >= activeLesson.segments.length - 1}
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
                title="Chế độ: Dừng sau mỗi câu"
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
                title="Chế độ: Lặp lại liên tục 1 câu hiện tại"
              >
                <Repeat1 className="size-3.5 shrink-0" />
                <span className="text-[11px] whitespace-nowrap">Lặp 1 câu</span>
              </button>
            </div>

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
                title={isPlayingShadowingAudio ? "Dừng nghe lại giọng bạn" : "Nghe lại giọng bạn vừa nhại câu này"}
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

          {/* Right: Speed & Back */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border/60">
              {[0.75, 0.9, 1.0, 1.25].map((s) => (
                <button
                  key={s}
                  onClick={() => handleChangePlaybackSpeed(s)}
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
              onClick={handleBack}
              className="h-7 px-2.5 rounded-lg text-xs font-bold gap-1 text-primary border-primary/40 hover:bg-primary/10"
            >
              <ArrowLeft className="size-3" />
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
      {/* Header */}
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

      {/* Scrollable Sentence List */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          ref={timelineContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1"
          onWheel={handleUserWheelOrTouch}
          onTouchMove={handleUserWheelOrTouch}
          onScroll={handleContainerScroll}
        >
          {activeLesson.segments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {isResyncing ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Languages className="size-5" />
                )}
              </div>
              <div className="space-y-1 max-w-[200px]">
                <p className="text-xs font-bold text-foreground">
                  {isResyncing ? "Đang tải phụ đề..." : "Chưa có danh sách phụ đề"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isResyncing
                    ? "Đang tự động tải phụ đề tiếng Anh từ YouTube."
                    : "Video chưa có phụ đề hoặc đang tải."}
                </p>
              </div>
              {!isResyncing && activeLesson.youtubeId && activeLesson.youtubeId !== "custom" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResyncCaptions()}
                  className="rounded-xl text-xs gap-1.5 h-8 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <RefreshCw className="size-3" />
                  <span>Tải phụ đề</span>
                </Button>
              )}
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-2 text-muted-foreground">
              <Search className="size-6 opacity-40" />
              <p className="text-xs">Không tìm thấy câu phù hợp với &quot;{transcriptSearch}&quot;</p>
            </div>
          ) : (
            filteredSegments.map((seg) => {
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
            })
          )}
        </div>

        {/* Floating Button: Resume Auto-Scroll */}
        {isDetachedFromActive && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
            <button
              type="button"
              onClick={handleResumeAutoScroll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all border border-primary/20 backdrop-blur-sm cursor-pointer select-none"
            >
              <LocateFixed className="size-3.5 animate-pulse" />
              <span>Cuộn về câu đang phát (#{activeSegmentIndex + 1})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Mode 2: Toolbar, Progress & Subtitle Accordion (Pronounce Left) ─
  const renderPronounceLeftControls = () => (
    <>
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
              onClick={() => handleChangePlaybackSpeed(s)}
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
          <span className="text-primary font-mono">{progressPercent}%</span>
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
          <div
            ref={accordionContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2"
          >
            {activeLesson.segments.map((seg, idx) => {
              const isCur = idx === activeSegmentIndex;
              return (
                <div
                  key={seg.segment_id}
                  ref={(el) => {
                    accordionItemRefs.current[idx] = el;
                  }}
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
        {/* Header */}
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

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2">
          {/* Target Sentence Box */}
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

          {/* Recording & Speech Recognition Preview */}
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

          {/* Audio Comparison */}
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

          {/* Score Summary Card */}
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
                      Ngữ điệu:{" "}
                      <b className="text-violet-600 dark:text-violet-400">
                        {score.prosody.toFixed(0)}%
                      </b>
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleStartRecord}
                className="rounded-xl text-xs font-bold gap-1 shrink-0 h-9 px-3 border-primary/40 text-primary hover:bg-primary/10"
              >
                <RotateCcw className="size-3" />
                <span>Nói lại</span>
              </Button>
            </div>
          ) : null}
        </div>

        {/* Action Bottom Bar */}
        <div className="p-2 sm:p-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
          <Button
            variant="outline"
            size="default"
            onClick={handlePrevSegment}
            disabled={activeSegmentIndex === 0}
            className="h-10 px-3 sm:px-4 rounded-xl font-bold text-xs border-border/80 flex items-center gap-1 hover:bg-muted/50 shrink-0"
            title="Về câu trước (←)"
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">Trước</span>
          </Button>

          <Button
            size="default"
            onClick={recordingStatus === "recording" ? handleStopRecord : handleStartRecord}
            disabled={recordingStatus === "evaluating"}
            className={cn(
              "flex-1 h-10 rounded-xl font-extrabold text-xs sm:text-sm gap-2 shadow-md transition-all",
              recordingStatus === "recording"
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-600/30"
                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25"
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
    <div className="flex flex-col bg-background select-none h-full overflow-hidden">
      <WordLookupPopup
        word={popupWord}
        anchorEl={popupAnchor}
        onClose={() => {
          setPopupWord(null);
          setPopupAnchor(null);
        }}
        onSaveToDeck={handleSaveWordToDeck}
      />

      {/* ── STUDIO TOP NAV BAR (Compact 44px) ── */}
      <header className="h-11 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: Back to Hub + Video Title + Add Video */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
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

          {/* Restart from beginning button */}
          {(currentTime > 2 || activeSegmentIndex > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestartFromBeginning()}
              className="h-7 px-2 rounded-lg text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground shrink-0 hidden lg:flex"
              title="Học lại từ đầu video (Câu 1)"
            >
              <RotateCcw className="size-3" />
              <span>Học lại từ đầu</span>
            </Button>
          )}

          {/* Resync Captions Button */}
          {activeLesson.youtubeId &&
            activeLesson.youtubeId !== "custom" &&
            activeLesson.youtubeId.length === 11 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResyncCaptions()}
              disabled={isResyncing}
              className="h-7 px-2 rounded-lg text-xs font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10 shrink-0 hidden md:flex"
              title="Cập nhật lại mốc thời gian phụ đề chuẩn xác nhất từ YouTube"
            >
              <RefreshCw className={cn("size-3", isResyncing && "animate-spin")} />
              <span>{isResyncing ? "Đang đồng bộ..." : "Làm mới phụ đề"}</span>
            </Button>
          )}

          {/* Add YouTube Video Button */}
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
                speechRec.stopListening();
                speechRec.resetTranscript();
                try {
                  recorder.cancel();
                } catch {}
                setRecordingStatus("idle");
                setShadowingRecordStatus("idle");
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
                speechRec.stopListening();
                speechRec.resetTranscript();
                try {
                  recorder.cancel();
                } catch {}
                setShadowingRecordStatus("idle");
                setRecordingStatus("idle");
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
          {/* Persistent Video Player Container */}
          <div
            ref={playerContainerRef}
            onMouseLeave={() => reclaimFocus()}
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

      {/* ── Corner Resume Confirmation Banner ── */}
      {cornerResumePrompt && (
        <div className="fixed bottom-5 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
          <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-primary/30 shadow-2xl shadow-black/25 max-w-[290px]">
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-xs">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-foreground leading-tight">Tiếp tục từ lần trước?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Bạn đã học đến câu{" "}
                  <span className="font-bold text-primary">{cornerResumePrompt.segmentIndex + 1}</span>/
                  {cornerResumePrompt.totalSegments}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseResumeBanner}
                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0 cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleConfirmResume}
                className="flex-1 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm shadow-primary/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Tiếp tục
              </button>
              <button
                type="button"
                onClick={handleDismissResume}
                className="flex-1 h-8 rounded-xl bg-muted/70 text-muted-foreground text-xs font-semibold hover:bg-muted hover:text-foreground border border-border/60 transition-all cursor-pointer flex items-center justify-center"
              >
                Từ câu 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Video Modal in Studio ── */}
      {showAddVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="bg-card border border-border/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="size-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Nạp video YouTube mới</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddVideoModal(false)}
                className="size-7 rounded-lg"
              >
                <X className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dán link video YouTube (hoặc ID 11 ký tự) để tự động lấy phụ đề tiếng Anh và bắt đầu học ngay.
            </p>
            <Input
              value={modalUrlInput}
              onChange={(e) => setModalUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="rounded-xl h-10 text-xs"
            />
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddVideoModal(false)}
                className="rounded-xl text-xs h-9"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleLoadNewVideoFromModal}
                disabled={isLoadingCustomUrl || !modalUrlInput.trim()}
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground gap-1.5"
              >
                {isLoadingCustomUrl && <Loader2 className="size-3.5 animate-spin" />}
                <span>{isLoadingCustomUrl ? "Đang tải..." : "Bắt đầu học"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Session Completed Modal ── */}
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
          handleRestartFromBeginning();
          setShowCompletedModal(false);
        }}
      />
    </div>
  );
}
