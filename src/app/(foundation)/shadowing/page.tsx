"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { triggerConfetti } from "@/components/ui/confetti";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { transcribeViaServer } from "@/lib/stt/service";
import { useSettingsStore } from "@/stores/settings-store";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { WordLookupPopup, type VocabWord } from "@/components/foundation/shadowing/WordLookupPopup";
import { ShadowingStudioEngine } from "@/components/foundation/shadowing/ShadowingStudioEngine";
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
  addVideosToLibrary,
  updateVideoInLibrary,
  deleteVideoFromLibrary,
  deleteChannelFromLibrary,
  migrateLibraryToIndexedDb,
  type SavedVideoLesson,
} from "@/lib/foundation/shadowing/shadowing-library.service";
import {
  saveTranscript,
  getTranscript,
  deleteTranscript,
} from "@/lib/foundation/shadowing/shadowing-transcript-db.service";
import {
  getVideoProgress,
  saveVideoProgress,
  resetVideoProgress,
  clearAllVideoProgress,
  getVideoHistoryList,
  getMostRecentVideoProgress,
  formatPlaybackTime,
  formatRelativeTime,
} from "@/lib/foundation/shadowing/shadowing-progress.service";
import {
  lookupLexiconWord,
  formatConciseMeaning,
  formatPartOfSpeech,
  fetchDictionaryDefinition,
} from "@/lib/foundation/vocabulary/lexicon-db.service";
import { getWordIpa } from "@/lib/foundation/shadowing/ipa-dictionary";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { mergeFragmentedSegments } from "@/lib/foundation/shadowing/transcript-stitcher";
import type { ScrapedVideoItem } from "@/app/api/shadowing/youtube-channel/route";
import {
  getChannelSyncConfig,
  toggleAutoDailyScan,
  recordTrackedChannel,
  removeTrackedChannel,
  syncTrackedChannelsFromLibrary,
  shouldRunDailyScan,
  markDailyScanCompleted,
  type ChannelSyncConfig,
} from "@/lib/foundation/shadowing/shadowing-channel-sync.service";
import {
  Radio,
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
  Trash2,
  Clock,
  Layers,
  Film,
  RefreshCw,
  Library,
  Pencil,
  RotateCcw,
  Sun,
  Moon,
  LocateFixed,
  Shuffle,
  SlidersHorizontal,
  Calendar,
  Dices,
  ArrowUpDown,
} from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export type UploadDateRange = "all" | "today" | "this_week" | "this_month" | "this_year";
export type UploadSortOrder = "newest" | "oldest";
export type UploadDateFilter = UploadDateRange | UploadSortOrder;

/**
 * Parses Vietnamese or English relative time text (e.g., "2 ngày trước", "3 weeks ago")
 * into an approximate timestamp (milliseconds).
 */
export function parseRelativeTimeToTimestamp(
  text?: string,
  baseTime = Date.now()
): number | null {
  if (!text) return null;
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;

  // Single word markers
  if (trimmed.includes("hôm qua") || trimmed.includes("yesterday")) {
    return baseTime - 24 * 60 * 60 * 1000;
  }
  if (trimmed.includes("hôm nay") || trimmed.includes("today")) {
    return baseTime - 2 * 60 * 60 * 1000; // approx 2 hours ago today
  }

  // Extract leading or embedded number
  const numMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
  const num = numMatch ? parseFloat(numMatch[1]) : 1;

  if (trimmed.includes("giây") || trimmed.includes("second") || trimmed.includes("sec")) {
    return Math.round(baseTime - num * 1000);
  }
  if (trimmed.includes("phút") || trimmed.includes("minute") || trimmed.includes("min")) {
    return Math.round(baseTime - num * 60 * 1000);
  }
  if (trimmed.includes("giờ") || trimmed.includes("hour") || trimmed.includes("hr")) {
    return Math.round(baseTime - num * 60 * 60 * 1000);
  }
  if (trimmed.includes("ngày") || trimmed.includes("day")) {
    return Math.round(baseTime - num * 24 * 60 * 60 * 1000);
  }
  if (trimmed.includes("tuần") || trimmed.includes("week")) {
    return Math.round(baseTime - num * 7 * 24 * 60 * 60 * 1000);
  }
  if (trimmed.includes("tháng") || trimmed.includes("month")) {
    return Math.round(baseTime - num * 30 * 24 * 60 * 60 * 1000);
  }
  if (trimmed.includes("năm") || trimmed.includes("year")) {
    return Math.round(baseTime - num * 365 * 24 * 60 * 60 * 1000);
  }

  return null;
}

export function getVideoTimestamp(item: SavedVideoLesson, baseTime = Date.now()): number {
  if (item.publishedAt) {
    const t = new Date(item.publishedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.publishedText) {
    const parsed = parseRelativeTimeToTimestamp(item.publishedText, baseTime);
    if (parsed !== null && !isNaN(parsed) && parsed > 0) return parsed;
  }
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

export function sortVideosByDate(videos: SavedVideoLesson[], order: UploadSortOrder = "newest"): SavedVideoLesson[] {
  const now = Date.now();
  return [...videos].sort((a, b) => {
    const timeA = getVideoTimestamp(a, now);
    const timeB = getVideoTimestamp(b, now);
    return order === "oldest" ? timeA - timeB : timeB - timeA;
  });
}

export function matchesUploadDateFilter(item: SavedVideoLesson, filter: UploadDateFilter): boolean {
  if (filter === "all" || filter === "newest" || filter === "oldest") return true;

  const now = Date.now();
  const timestamp = getVideoTimestamp(item, now);
  if (timestamp > 0) {
    const diffMs = now - timestamp;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (filter === "today") return diffDays <= 1.05;
    if (filter === "this_week") return diffDays <= 7.05;
    if (filter === "this_month") return diffDays <= 31.05;
    if (filter === "this_year") return diffDays <= 366;
  }

  return false;
}

/**
 * Checks whether a video lesson matches the selected channel filter.
 * Uses trimmed, case-insensitive comparison to handle dirty/unnormalized channel names.
 */
export function matchesChannelFilter(item: SavedVideoLesson, filterChannel: string): boolean {
  if (!filterChannel || filterChannel === "all") return true;
  const target = filterChannel.trim().toLowerCase();
  const itemChannel = (item.channel || "").trim().toLowerCase();
  return itemChannel === target;
}

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

const EMPTY_SHADOWING_LESSON: CorodomoVideoLesson = {
  id: "",
  youtubeId: "",
  title: "Chưa chọn bài học",
  channel: "",
  cefrLevel: "Custom",
  playlistName: "",
  playlistId: "",
  thumbnail: "",
  duration: "00:00",
  segments: [],
};

export default function CorodomoShadowingStudioPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const tts = useBrowserTTS();
  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const speechRecRef = useRef(speechRec);
  speechRecRef.current = speechRec;
  const currentVideoIdRef = useRef<string | null>(null);

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

  // Keep global app header hidden when in immersive studio mode
  useEffect(() => {
    if (currentView === "studio") {
      setHideAppHeader(true);
    } else {
      setHideAppHeader(false);
    }
    return () => setHideAppHeader(false);
  }, [currentView, setHideAppHeader]);

  const [isMounted, setIsMounted] = useState(false);

  // Safe non-localStorage initial state to eliminate SSR React Hydration Mismatch
  const [activeLesson, setActiveLesson] = useState<CorodomoVideoLesson>(EMPTY_SHADOWING_LESSON);
  const activeLessonRef = useRef(activeLesson);
  activeLessonRef.current = activeLesson;

  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const activeSegmentIndexRef = useRef(activeSegmentIndex);
  activeSegmentIndexRef.current = activeSegmentIndex;

  const initialResumeTimeRef = useRef<number>(0);
  const lastSavedProgressTimeRef = useRef<number>(0);

  // Auto-heal fragmented 1-2 word sentences in activeLesson so current view is 100% clean
  useEffect(() => {
    if (!activeLesson?.segments || activeLesson.segments.length <= 1) return;
    const healed = mergeFragmentedSegments(activeLesson.segments);
    if (healed.length !== activeLesson.segments.length) {
      setActiveLesson((prev) => ({
        ...prev,
        segments: healed,
      }));
    }
  }, [activeLesson?.id]);

  // Load transcript from IndexedDB if activeLesson was restored without segments from localStorage
  useEffect(() => {
    if (
      activeLesson?.youtubeId &&
      (!activeLesson.segments || activeLesson.segments.length === 0)
    ) {
      getTranscript(activeLesson.youtubeId).then((dbSegments) => {
        if (dbSegments && dbSegments.length > 0) {
          const healed = mergeFragmentedSegments(dbSegments);
          setActiveLesson((prev) => ({
            ...prev,
            segments: healed,
          }));
        }
      });
    }
  }, [activeLesson?.id, activeLesson?.youtubeId]);

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
  const [modalTargetChannel, setModalTargetChannel] = useState<string>("auto");
  const [modalCustomChannelName, setModalCustomChannelName] = useState<string>("");
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

  // ─── Corner Resume Prompt State ─────────────────────────────────────
  const [cornerResumePrompt, setCornerResumePrompt] = useState<{
    segmentIndex: number;
    totalSegments: number;
    currentTime: number;
  } | null>(null);

  // ─── Word Lookup Popup State ─────────────────────────────────────────
  const [popupWord, setPopupWord] = useState<VocabWord | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null);

  // Tự động đóng popup tra từ khi chuyển sang câu khác
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

  // ─── Subtitle Auto-Scroll & Gesture Navigation ───────────────────────
  const [isDetachedFromActive, setIsDetachedFromActive] = useState(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrolledIndexRef = useRef<number>(0);
  const lastReportedTimeRef = useRef<number>(0);
  const isSeekingJumpRef = useRef<boolean>(false);

  // ─── Keyboard & Window Focus Reclaiming (Prevents YouTube IFrame Keyboard Trap) ──
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

  // ─── Video Library (CRUD) State ──────────────────────────────────────
  const [videoLibrary, setVideoLibrary] = useState<SavedVideoLesson[]>([]);
  const [librarySearch, setLibrarySearch] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<SavedVideoLesson | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editChannel, setEditChannel] = useState("");

  // ─── Load Video Library on Mount & Migrate to IndexedDB ──────────────
  useEffect(() => {
    setIsMounted(true);
    const initData = async () => {
      await migrateLibraryToIndexedDb();
      const lib = getVideoLibrary();
      setVideoLibrary(lib);

      if (lib.length > 0) {
        // Tìm bài học có tiến độ dở dang gần nhất, hoặc mặc định bài đầu tiên
        const recentProgress = getMostRecentVideoProgress();
        let targetLesson: CorodomoVideoLesson = lib[0];
        let targetProgress = null;

        if (recentProgress) {
          const foundInLib = lib.find((v) => v.youtubeId === recentProgress.youtubeId);
          const foundInPresets = CORODOMO_VIDEO_PRESETS.find((p) => p.youtubeId === recentProgress.youtubeId);
          if (foundInLib) {
            targetLesson = foundInLib;
            targetProgress = recentProgress;
          } else if (foundInPresets) {
            targetLesson = foundInPresets;
            targetProgress = recentProgress;
          }
        }

        let segments = targetLesson.segments || [];
        if (segments.length === 0 && targetLesson.youtubeId) {
          const cached = await getTranscript(targetLesson.youtubeId);
          if (cached && cached.length > 0) {
            segments = cached;
          }
        }
        const merged = mergeFragmentedSegments(segments);
        const resolvedLesson = {
          ...targetLesson,
          segments: merged,
        };
        setActiveLesson(resolvedLesson);

        const p = targetProgress || (targetLesson.youtubeId ? getVideoProgress(targetLesson.youtubeId) : null);
        if (p && (p.currentTime > 2 || p.segmentIndex > 0)) {
          const lastSeg = merged[merged.length - 1];
          const isAtEnd = lastSeg && p.currentTime >= lastSeg.end_time - 1;
          if (!isAtEnd) {
            initialResumeTimeRef.current = p.currentTime;
            const savedIdx = Math.min(p.segmentIndex, Math.max(0, merged.length - 1));
            setActiveSegmentIndex(savedIdx);
          }
        }



        // Sync tracked channels from library
        const syncedConfig = syncTrackedChannelsFromLibrary(lib);
        setChannelSyncConfig(syncedConfig);

        // Check auto daily scan if enabled
        if (shouldRunDailyScan()) {
          markDailyScanCompleted();
          setChannelSyncConfig(getChannelSyncConfig());

          const existingIds = new Set(lib.map((v) => v.youtubeId));
          const channelsToScan = syncedConfig.trackedChannels.slice(0, 3);
          if (channelsToScan.length > 0) {
            Promise.all(
              channelsToScan.map(async (ch) => {
                try {
                  const res = await fetch("/api/shadowing/youtube-channel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: ch.channelUrl }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    return (data.videos as ScrapedVideoItem[]) || [];
                  }
                } catch {}
                return [];
              })
            ).then((results) => {
              const flattened = results.flat();
              const fresh = flattened.filter(
                (v: ScrapedVideoItem) => !existingIds.has(v.youtubeId)
              );
              if (fresh.length > 0) {
                const uniqueFreshMap = new Map<string, ScrapedVideoItem>();
                fresh.forEach((f) => uniqueFreshMap.set(f.youtubeId, f));
                const list = Array.from(uniqueFreshMap.values());
                setNewDiscoveredVideos(list);
                setSelectedDiscoveredIds(new Set(list.map((v) => v.youtubeId)));
                toast.custom({
                  type: "info",
                  title: "Video mới hôm nay!",
                  description: `Hệ thống vừa tìm thấy ${list.length} bài học mới từ các kênh bạn theo dõi.`,
                  durationMs: 8000,
                  action: {
                    label: "Xem ngay",
                    onClick: () => setShowChannelSyncModal(true),
                  },
                });
              }
            });
          }
        }
      }
    };
    initData();
  }, []);

  // ─── Background Metadata Auto-Sync ────────────────────────────────────────
  // Silently backfills publishedAt & duration for library items that are missing them.
  // Runs once after mount, throttled to avoid hammering YouTube's API.
  useEffect(() => {
    const syncMissingMetadata = async () => {
      const lib = getVideoLibrary();
      const needsSync = lib.filter(
        (v) =>
          v.youtubeId &&
          v.youtubeId.length === 11 &&
          !v.youtubeId.startsWith("custom") &&
          (!v.publishedAt || !v.duration || v.duration === "10:00")
      );

      if (needsSync.length === 0) return;

      // Process in batches of 3, 300ms apart to avoid rate-limiting
      for (let i = 0; i < needsSync.length; i += 3) {
        const batch = needsSync.slice(i, i + 3);
        await Promise.all(
          batch.map(async (video) => {
            try {
              const res = await fetch(
                `/api/shadowing/youtube-transcript?videoId=${video.youtubeId}`
              );
              if (!res.ok) return;
              const meta = await res.json();
              if (!meta.success) return;

              const updates: Partial<SavedVideoLesson> = {};
              if (meta.publishedAt && !video.publishedAt) {
                updates.publishedAt = meta.publishedAt;
              }
              if (meta.duration && (!video.duration || video.duration === "10:00")) {
                updates.duration = meta.duration;
              }
              if (Object.keys(updates).length > 0) {
                const updated = updateVideoInLibrary(video.id, updates);
                setVideoLibrary(updated);
              }
            } catch {
              // Silently ignore errors – best-effort sync
            }
          })
        );
        if (i + 3 < needsSync.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    };

    // Small delay to let the page finish rendering first
    const timer = setTimeout(syncMissingMetadata, 3000);
    return () => clearTimeout(timer);
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
    const item = videoLibrary.find((v) => v.id === id || v.youtubeId === id);
    const updated = deleteVideoFromLibrary(id);
    setVideoLibrary(updated);
    if (item?.youtubeId) {
      resetVideoProgress(item.youtubeId);
      deleteTranscript(item.youtubeId).catch(() => {});
    }
    toast.info("Đã xóa bài học khỏi thư viện");
  };

  const [isResyncing, setIsResyncing] = useState(false);

  const handleResyncCaptions = useCallback(
    async (customVideoId?: string) => {
      const videoIdToSync = customVideoId || activeLesson?.youtubeId;
      if (!videoIdToSync || videoIdToSync === "custom" || videoIdToSync.length !== 11) {
        toast.info("Bài học tùy chỉnh", "Bài học này không liên kết với video YouTube công khai.");
        return;
      }

      try {
        setIsResyncing(true);
        toast.info(
          "Đang làm mới phụ đề",
          "Đang tải bản bóc tách mili-giây siêu chính xác mới nhất từ YouTube..."
        );

        const res = await fetch("/api/shadowing/youtube-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: videoIdToSync }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || "Không thể tải phụ đề mới từ YouTube");
        }

        const data = await res.json();
        if (!data.segments || data.segments.length === 0) {
          throw new Error("Không có dữ liệu phân đoạn phụ đề.");
        }

        const updatedSegments = data.segments;
        await saveTranscript(videoIdToSync, updatedSegments);

        setActiveLesson((prev) => ({
          ...prev,
          segments: updatedSegments,
        }));

        const updatedLib = updateVideoInLibrary(activeLesson.id, {
          segments: updatedSegments,
          needsResync: false,
          schemaVersion: 3,
        });
        setVideoLibrary(updatedLib);

        toast.success(
          "Làm mới phụ đề thành công!",
          `Đã nạp ${updatedSegments.length} câu với mốc thời gian mili-giây chuẩn xác.`
        );
      } catch (err: any) {
        toast.error("Lỗi làm mới phụ đề", err.message || "Vui lòng thử lại sau.");
      } finally {
        setIsResyncing(false);
      }
    },
    [activeLesson]
  );

  // Auto-resync legacy cached lesson or newly imported lesson with empty segments
  useEffect(() => {
    if (
      !activeLesson?.youtubeId ||
      activeLesson.youtubeId === "custom" ||
      activeLesson.youtubeId.length !== 11
    )
      return;
    const library = getVideoLibrary();
    const currentInLib = library.find(
      (v) => v.id === activeLesson.id || v.youtubeId === activeLesson.youtubeId
    );
    if (
      currentInLib?.needsResync ||
      (currentInLib && (currentInLib.schemaVersion || 0) < 3) ||
      !activeLesson.segments ||
      activeLesson.segments.length === 0
    ) {
      handleResyncCaptions(activeLesson.youtubeId);
    }
  }, [activeLesson?.id, activeLesson?.youtubeId, handleResyncCaptions]);

  // ─── Hub View & Filter Controls State ────────────────────────────────
  const [hubSubView, setHubSubView] = useState<"library" | "history">("library");
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("all");
  const [channelToDelete, setChannelToDelete] = useState<{
    channelName: string;
    videoCount: number;
  } | null>(null);

  // Horizontal Channel Carousel Scroll State & Ref
  const channelScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const checkChannelScroll = useCallback(() => {
    if (!channelScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = channelScrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  const handleScrollChannel = (direction: "left" | "right") => {
    if (!channelScrollRef.current) return;
    const offset = direction === "left" ? -280 : 280;
    channelScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkChannelScroll, 250);
  };

  const [selectedDurationFilter, setSelectedDurationFilter] = useState<string>("all");
  const [customDurationMin, setCustomDurationMin] = useState<string>("");
  const [customDurationMax, setCustomDurationMax] = useState<string>("");
  const [selectedSortOrder, setSelectedSortOrder] = useState<UploadSortOrder>("newest");
  const [selectedUploadDateFilter, setSelectedUploadDateFilter] = useState<UploadDateRange>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<"channel" | "duration" | "uploadDate" | "status" | null>(null);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    if (!activeFilterDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest("[data-filter-dropdown]")) {
        setActiveFilterDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeFilterDropdown]);

  // ─── Modal Batch Import State (Channel / Playlist) ───────────────────
  const [addModalTab, setAddModalTab] = useState<"single" | "channel">("single");
  const [channelUrlInput, setChannelUrlInput] = useState<string>("");
  const [isScanningChannel, setIsScanningChannel] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<{
    sourceTitle: string;
    sourceChannel: string;
    type: "channel" | "playlist";
    total: number;
    videos: ScrapedVideoItem[];
  } | null>(null);
  const [selectedScrapedIds, setSelectedScrapedIds] = useState<Set<string>>(new Set());
  const [isImportingScraped, setIsImportingScraped] = useState<boolean>(false);

  // ─── Channel Sync & Daily Auto-Scan State ─────────────────────────────
  const [showChannelSyncModal, setShowChannelSyncModal] = useState<boolean>(false);
  const [channelSyncConfig, setChannelSyncConfig] = useState<ChannelSyncConfig>(() => ({
    autoDailyScan: true,
    lastDailyScanDate: "",
    trackedChannels: [],
  }));
  const [isSyncingChannels, setIsSyncingChannels] = useState<boolean>(false);
  const [newDiscoveredVideos, setNewDiscoveredVideos] = useState<ScrapedVideoItem[]>([]);
  const [selectedDiscoveredIds, setSelectedDiscoveredIds] = useState<Set<string>>(new Set());
  const [syncSummaryMessage, setSyncSummaryMessage] = useState<string>("");

  // ─── History Items Derived from Saved Progress ───────────────────────
  const historyItems = useMemo(() => {
    if (!isMounted) return [];
    const list = getVideoHistoryList();
    return list.map((progress) => {
      const lesson =
        videoLibrary.find((v) => v.youtubeId === progress.youtubeId) ||
        CORODOMO_VIDEO_PRESETS.find((p) => p.youtubeId === progress.youtubeId) || {
          id: `history_${progress.youtubeId}`,
          youtubeId: progress.youtubeId,
          title: `YouTube Video (${progress.youtubeId})`,
          channel: "YouTube",
          thumbnail: `https://img.youtube.com/vi/${progress.youtubeId}/hqdefault.jpg`,
          duration: "05:00",
          segments: [],
          cefrLevel: "Custom" as const,
          playlistName: "Lịch sử học tập",
          playlistId: "history_pl",
        };
      return {
        ...progress,
        lesson,
      };
    });
  }, [isMounted, videoLibrary, historyRefreshKey]);

  // Extract unique channels for filter dropdown
  const uniqueChannels = useMemo(() => {
    const set = new Set<string>();
    videoLibrary.forEach((v) => {
      if (v.channel && v.channel.trim() && v.channel !== "YouTube") {
        set.add(v.channel.trim());
      }
    });
    return Array.from(set).sort();
  }, [videoLibrary]);

  // Channel statistics for the Horizontal Carousel Bar (Name, Count, Thumbnail)
  const channelStats = useMemo(() => {
    const map = new Map<string, { count: number; thumbnail?: string }>();
    const trackedMap = new Map<string, string>();
    channelSyncConfig.trackedChannels.forEach((tc) => {
      if (tc.thumbnail) trackedMap.set(tc.channelName.toLowerCase(), tc.thumbnail);
    });

    videoLibrary.forEach((v) => {
      const ch = (v.channel || "").trim();
      if (!ch || ch === "YouTube") return;
      const existing = map.get(ch);
      if (existing) {
        existing.count += 1;
        if (!existing.thumbnail && v.thumbnail) existing.thumbnail = v.thumbnail;
      } else {
        map.set(ch, {
          count: 1,
          thumbnail: trackedMap.get(ch.toLowerCase()) || v.thumbnail,
        });
      }
    });

    return Array.from(map.entries())
      .map(([channelName, data]) => ({
        channelName,
        count: data.count,
        thumbnail: data.thumbnail,
      }))
      .sort((a, b) => b.count - a.count);
  }, [videoLibrary, channelSyncConfig.trackedChannels]);

  const parseDurationSec = (durationStr?: string): number => {
    if (!durationStr) return 300;
    const parts = durationStr.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 300;
  };

  // ─── Filtered Library with Filters & Shuffle ─────────────────────────
  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    let list = videoLibrary;

    // 1. Text Search Filter
    if (q) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.channel.toLowerCase().includes(q)
      );
    }

    // 2. Channel Filter
    if (selectedChannelFilter !== "all") {
      list = list.filter((item) => matchesChannelFilter(item, selectedChannelFilter));
    }

    // 3. Duration Filter
    if (selectedDurationFilter !== "all") {
      list = list.filter((item) => {
        const sec = parseDurationSec(item.duration);
        if (selectedDurationFilter === "short") return sec < 180;
        if (selectedDurationFilter === "medium") return sec >= 180 && sec <= 600;
        if (selectedDurationFilter === "long") return sec > 600;
        if (selectedDurationFilter === "custom") {
          const minVal = parseFloat(customDurationMin);
          const maxVal = parseFloat(customDurationMax);
          const hasMin = !isNaN(minVal) && minVal >= 0;
          const hasMax = !isNaN(maxVal) && maxVal > 0;
          if (hasMin && hasMax) {
            const low = Math.min(minVal, maxVal) * 60;
            const high = Math.max(minVal, maxVal) * 60;
            return sec >= low && sec <= high;
          }
          if (hasMin) return sec >= minVal * 60;
          if (hasMax) return sec <= maxVal * 60;
          return true;
        }
        return true;
      });
    }

    // 4. Upload Date Filter
    if (selectedUploadDateFilter !== "all") {
      list = list.filter((item) => matchesUploadDateFilter(item, selectedUploadDateFilter));
    }

    // 5. Learning Status Filter
    if (selectedStatusFilter !== "all") {
      list = list.filter((item) => {
        const p = getVideoProgress(item.youtubeId);
        const hasProgress = p && (p.currentTime > 2 || p.segmentIndex > 0);
        if (selectedStatusFilter === "in_progress") return hasProgress;
        if (selectedStatusFilter === "not_started") return !hasProgress;
        return true;
      });
    }

    // 6. Sort Order: Newest (default, YouTube-style) vs Oldest
    list = sortVideosByDate(list, selectedSortOrder);

    // 7. Shuffle Order (Overrides sort when active)
    if (isShuffled && shuffledOrder.length > 0) {
      const orderMap = new Map<string, number>();
      shuffledOrder.forEach((id, idx) => orderMap.set(id, idx));
      list = [...list].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        return idxA - idxB;
      });
    }

    return list;
  }, [
    videoLibrary,
    librarySearch,
    selectedChannelFilter,
    selectedDurationFilter,
    customDurationMin,
    customDurationMax,
    selectedUploadDateFilter,
    selectedSortOrder,
    selectedStatusFilter,
    isShuffled,
    shuffledOrder,
    historyRefreshKey,
  ]);

  // ─── Filter Status & Label Helpers ────────────────────────────────────
  const isAnyFilterActive = useMemo(() => {
    return (
      selectedChannelFilter !== "all" ||
      selectedDurationFilter !== "all" ||
      selectedUploadDateFilter !== "all" ||
      selectedSortOrder !== "newest" ||
      selectedStatusFilter !== "all" ||
      librarySearch.trim().length > 0
    );
  }, [
    selectedChannelFilter,
    selectedDurationFilter,
    selectedUploadDateFilter,
    selectedSortOrder,
    selectedStatusFilter,
    librarySearch,
  ]);

  const activeFilterCount = useMemo(() => {
    return [
      selectedChannelFilter !== "all",
      selectedDurationFilter !== "all",
      selectedUploadDateFilter !== "all",
      selectedSortOrder !== "newest",
      selectedStatusFilter !== "all",
      librarySearch.trim().length > 0,
    ].filter(Boolean).length;
  }, [
    selectedChannelFilter,
    selectedDurationFilter,
    selectedUploadDateFilter,
    selectedSortOrder,
    selectedStatusFilter,
    librarySearch,
  ]);

  const handleResetAllFilters = useCallback(() => {
    setSelectedChannelFilter("all");
    setSelectedDurationFilter("all");
    setCustomDurationMin("");
    setCustomDurationMax("");
    setSelectedUploadDateFilter("all");
    setSelectedSortOrder("newest");
    setSelectedStatusFilter("all");
    setLibrarySearch("");
    setActiveFilterDropdown(null);
  }, []);

  const handleSelectChannel = (channelName: string) => {
    if (selectedChannelFilter.trim().toLowerCase() === channelName.trim().toLowerCase()) {
      setSelectedChannelFilter("all");
    } else {
      setSelectedChannelFilter(channelName.trim());
    }
  };

  const handleConfirmDeleteChannel = () => {
    if (!channelToDelete) return;
    const { channelName } = channelToDelete;
    const result = deleteChannelFromLibrary(channelName);
    setVideoLibrary(result.updatedLibrary);
    setChannelSyncConfig(getChannelSyncConfig());

    if (selectedChannelFilter.trim().toLowerCase() === channelName.trim().toLowerCase()) {
      setSelectedChannelFilter("all");
    }
    setChannelToDelete(null);
    toast.success(
      `Đã xóa kênh "${channelName}"`,
      `Đã xóa sạch ${result.deletedCount} video bài học và transcript khỏi thư viện.`
    );
  };

  const getDurationFilterLabel = () => {
    if (selectedDurationFilter === "short") return "< 3 phút";
    if (selectedDurationFilter === "medium") return "3 - 10 phút";
    if (selectedDurationFilter === "long") return "> 10 phút";
    if (selectedDurationFilter === "custom") {
      const min = customDurationMin.trim();
      const max = customDurationMax.trim();
      if (min && max) return `${min} - ${max} phút`;
      if (min) return `≥ ${min} phút`;
      if (max) return `≤ ${max} phút`;
      return "Tùy chỉnh";
    }
    return "Thời lượng";
  };

  const getUploadDateFilterLabel = () => {
    let rangeLabel = "";
    if (selectedUploadDateFilter === "today") rangeLabel = "Hôm nay (24h)";
    else if (selectedUploadDateFilter === "this_week") rangeLabel = "Tuần này";
    else if (selectedUploadDateFilter === "this_month") rangeLabel = "Tháng này";
    else if (selectedUploadDateFilter === "this_year") rangeLabel = "Năm nay";

    if (rangeLabel) {
      return selectedSortOrder === "oldest" ? `${rangeLabel} • Cũ nhất` : rangeLabel;
    }
    return selectedSortOrder === "oldest" ? "Cũ nhất" : "Mới nhất (YouTube)";
  };

  const getStatusFilterLabel = () => {
    if (selectedStatusFilter === "in_progress") return "Đang học dở";
    if (selectedStatusFilter === "not_started") return "Chưa học";
    return "Trạng thái";
  };

  // ─── Shuffle Handlers ────────────────────────────────────────────────
  const handleShuffleLibrary = () => {
    const ids = videoLibrary.map((v) => v.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffledOrder(ids);
    setIsShuffled(true);
    triggerConfetti();
    toast.success("🎲 Đã xáo trộn ngẫu nhiên danh sách bài học!");
  };

  const handleResetShuffle = () => {
    setIsShuffled(false);
    setShuffledOrder([]);
    toast.info("Đã khôi phục thứ tự ban đầu");
  };

  // ─── History Action Handlers ─────────────────────────────────────────
  const handleRemoveFromHistory = (youtubeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    resetVideoProgress(youtubeId);
    setHistoryRefreshKey((prev) => prev + 1);
    toast.info("Đã xóa khỏi lịch sử học tập");
  };

  const handleClearAllHistory = () => {
    if (typeof window !== "undefined" && window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử học tập?")) {
      clearAllVideoProgress();
      setHistoryRefreshKey((prev) => prev + 1);
      toast.success("Đã xóa toàn bộ lịch sử học tập");
    }
  };

  // ─── Channel / Playlist Scan & Import Handlers ───────────────────────
  const handleScanChannel = async () => {
    const input = channelUrlInput.trim();
    if (!input) {
      toast.error("Vui lòng nhập link kênh hoặc playlist YouTube");
      return;
    }

    setIsScanningChannel(true);
    toast.info("Đang quét danh sách video YouTube...", "Vui lòng đợi giây lát.");

    try {
      const res = await fetch("/api/shadowing/youtube-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.videos || data.videos.length === 0) {
        throw new Error(data.error || "Không tìm thấy video nào.");
      }

      setScannedResult(data);

      // Auto select videos not yet in library
      const existingIds = new Set(videoLibrary.map((v) => v.youtubeId));
      const newIds = new Set<string>();
      data.videos.forEach((v: any) => {
        if (!existingIds.has(v.youtubeId)) {
          newIds.add(v.youtubeId);
        }
      });

      // If all are already in library, select all
      if (newIds.size === 0) {
        data.videos.forEach((v: any) => newIds.add(v.youtubeId));
      }

      setSelectedScrapedIds(newIds);
      toast.success(
        `Đã tìm thấy ${data.videos.length} video!`,
        `Nguồn: ${data.sourceTitle || data.sourceChannel}`
      );
    } catch (err: any) {
      toast.error("Không thể quét video", err.message || "Vui lòng kiểm tra lại link.");
    } finally {
      setIsScanningChannel(false);
    }
  };

  const handleBatchImportVideos = () => {
    if (!scannedResult || selectedScrapedIds.size === 0) {
      toast.info("Chưa có video nào được chọn");
      return;
    }

    setIsImportingScraped(true);
    try {
      const selectedVideos = scannedResult.videos.filter((v) =>
        selectedScrapedIds.has(v.youtubeId)
      );

      const lessonsToImport: CorodomoVideoLesson[] = selectedVideos.map((v) => ({
        id: `custom_${v.youtubeId}`,
        youtubeId: v.youtubeId,
        title: v.title,
        channel: v.channel || scannedResult.sourceChannel || "YouTube",
        cefrLevel: "Custom" as const,
        playlistName: scannedResult.sourceTitle || "Kênh đã lưu",
        playlistId: `pl_${scannedResult.type || "batch"}_${Date.now()}`,
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`,
        duration: v.duration || "05:00",
        publishedAt: v.publishedAt,
        publishedText: v.publishedText,
        segments: [], // Empty segments will auto-fetch when user starts studying!
      }));

      const updated = addVideosToLibrary(lessonsToImport);
      setVideoLibrary(updated);

      // Track channel automatically
      if (scannedResult.sourceChannel && channelUrlInput.trim()) {
        const updatedConfig = recordTrackedChannel(
          scannedResult.sourceChannel,
          channelUrlInput.trim(),
          selectedVideos[0]?.thumbnail
        );
        setChannelSyncConfig(updatedConfig);
      }

      setShowAddVideoModal(false);
      setScannedResult(null);
      setChannelUrlInput("");
      setSelectedScrapedIds(new Set());

      triggerConfetti();
      toast.success(
        `Đã thêm ${lessonsToImport.length} bài học vào Thư viện!`,
        "Bấm vào bất kỳ video nào để bắt đầu luyện Shadowing ngay."
      );
    } catch (err: any) {
      toast.error("Lỗi khi thêm video", err.message || "Vui lòng thử lại sau.");
    } finally {
      setIsImportingScraped(false);
    }
  };

  // ─── Channel Sync & Daily Scan Handlers ──────────────────────────────
  const handleManualChannelScan = async () => {
    setIsSyncingChannels(true);
    setNewDiscoveredVideos([]);
    setSyncSummaryMessage("");

    try {
      const channels = channelSyncConfig.trackedChannels;
      if (channels.length === 0) {
        toast.info("Chưa có kênh nào", "Hãy nạp video từ Kênh YouTube vào Thư viện để tự động theo dõi.");
        return;
      }

      toast.info("Đang kiểm tra video mới...", `Đang quét ${channels.length} kênh theo dõi.`);
      const existingIds = new Set(videoLibrary.map((v) => v.youtubeId));
      const foundNew: ScrapedVideoItem[] = [];

      for (const ch of channels) {
        try {
          const res = await fetch("/api/shadowing/youtube-channel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: ch.channelUrl }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.videos && Array.isArray(data.videos)) {
              for (const v of data.videos) {
                if (!existingIds.has(v.youtubeId) && !foundNew.some((x) => x.youtubeId === v.youtubeId)) {
                  foundNew.push(v);
                }
              }
            }
          }
        } catch (e) {
          console.error("Scan channel error:", e);
        }
      }

      setNewDiscoveredVideos(foundNew);
      setSelectedDiscoveredIds(new Set(foundNew.map((v) => v.youtubeId)));

      if (foundNew.length > 0) {
        setSyncSummaryMessage(`Tìm thấy ${foundNew.length} video mới chưa có trong thư viện!`);
        toast.success(`Tìm thấy ${foundNew.length} video mới!`);
      } else {
        setSyncSummaryMessage("Tất cả bài học trên các kênh theo dõi đã có trong thư viện của bạn.");
        toast.info("Bạn đã có tất cả video mới nhất!");
      }
    } catch (err: any) {
      toast.error("Lỗi khi quét kênh", err.message || "Vui lòng thử lại sau.");
    } finally {
      setIsSyncingChannels(false);
    }
  };

  const handleBatchImportDiscoveredVideos = () => {
    if (newDiscoveredVideos.length === 0 || selectedDiscoveredIds.size === 0) {
      toast.info("Chưa chọn video nào để thêm");
      return;
    }

    const selected = newDiscoveredVideos.filter((v) => selectedDiscoveredIds.has(v.youtubeId));
    const lessonsToImport: CorodomoVideoLesson[] = selected.map((v) => ({
      id: `custom_${v.youtubeId}`,
      youtubeId: v.youtubeId,
      title: v.title,
      channel: v.channel || "YouTube",
      cefrLevel: "Custom" as const,
      playlistName: "Video Mới Cập Nhật",
      playlistId: `pl_sync_${Date.now()}`,
      thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`,
      duration: v.duration || "05:00",
      publishedAt: v.publishedAt,
      publishedText: v.publishedText,
      segments: [],
    }));

    const updated = addVideosToLibrary(lessonsToImport);
    setVideoLibrary(updated);
    setNewDiscoveredVideos([]);
    setSelectedDiscoveredIds(new Set());
    setShowChannelSyncModal(false);
    triggerConfetti();
    toast.success(`Đã thêm ${lessonsToImport.length} bài học mới vào Thư viện!`);
  };

  const handleRemoveTrackedChannel = (channelUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeTrackedChannel(channelUrl);
    setChannelSyncConfig(updated);
    toast.info("Đã hủy theo dõi kênh");
  };


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
        // If player already exists for this video, check if we need to seek to resume time
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

        // If player already exists for another video, load the video directly with startSeconds
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
              // Automatically reclaim keyboard focus after any interaction with YouTube player
              setTimeout(() => {
                reclaimFocusRef.current?.();
              }, 80);

              if (event.data === 3) {
                // YT.PlayerState.BUFFERING (user is scrubbing timeline or seeking)
                isSeekingJumpRef.current = true;
              } else if (event.data === 1) {
                // If playing event arrives during auto-pause or while waiting at sentence end in pause_after_sentence mode, force pause!
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

    // Immediately save progress on pause
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
              // Transient Seek Grace Guard: While YouTube player is processing an asynchronous seekTo,
              // it continues reporting stale playback time from the previous position via postMessage IPC.
              // We must ignore these stale reports until the player settles near the seek target.
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

              // Periodic progress auto-save (throttled every 2.5s while playing)
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

                // ─── 1. MODE: LẶP 1 CÂU (loop_sentence) ─────────────────────
                if (playModeRef.current === "loop_sentence" && currentSeg) {
                  // Transient Seek Grace Guard: When seeking to start of sentence (or jumping to another segment via [→]),
                  // YouTube iframe postMessage IPC takes ~100-300ms to update reported player time.
                  // During this grace window, do NOT trigger loop seek!
                  if (Date.now() < seekGraceUntilRef.current) {
                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }

                  const nextSeg = segments[curIdx + 1];
                  const prevSeg = segments[curIdx - 1];
                  const speed = playbackSpeedRef.current || 1.0;
                  // Lead compensation for YouTube IFrame IPC latency (~60-80ms) without clipping final consonants
                  const leadCompensation = Math.max(0.08, 0.08 * speed);
                  let stopThreshold = currentSeg.end_time - leadCompensation;

                  // Lead-out Guard: Ensure stopThreshold pauses before nextSeg starts
                  if (nextSeg) {
                    stopThreshold = Math.min(stopThreshold, nextSeg.start_time - 0.08);
                  }

                  const isAtEndOfSentence = time >= stopThreshold;
                  if (isAtEndOfSentence && !isLoopSeekingRef.current) {
                    isLoopSeekingRef.current = true;
                    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
                      const minBound = prevSeg ? prevSeg.end_time : 0;
                      const loopSeekTime = Math.max(minBound, Math.max(0, currentSeg.start_time - 0.18));
                      playerRef.current.seekTo(loopSeekTime, true);
                    }
                    setTimeout(() => {
                      isLoopSeekingRef.current = false;
                    }, 400);
                  }

                  // Auto Catch-up ONLY if user explicitly dragged/scrubbed timeline far away
                  if (!isLoopSeekingRef.current && Date.now() >= seekGraceUntilRef.current) {
                    if (time >= currentSeg.end_time + 1.5 || time < currentSeg.start_time - 2.0) {
                      const matchedIdx = segments.findIndex(
                        (seg) => time >= seg.start_time - 0.1 && time < seg.end_time + 0.1
                      );
                      if (matchedIdx !== -1 && matchedIdx !== curIdx) {
                        isSeekingJumpRef.current = true;
                        activeSegmentIndexRef.current = matchedIdx;
                        setActiveSegmentIndex(matchedIdx);
                        animId = requestAnimationFrame(syncLoop);
                        return;
                      }
                    }
                  }

                  // Lock sync engine to currently looping sentence, never advance automatically!
                  animId = requestAnimationFrame(syncLoop);
                  return;
                }

                // ─── 2. MODE: DỪNG SAU CÂU (pause_after_sentence) ───────────
                if (playModeRef.current === "pause_after_sentence" && currentSeg) {
                  const nextSeg = segments[curIdx + 1];
                  const speed = playbackSpeedRef.current || 1.0;
                  const leadCompensation = Math.max(0.08, 0.08 * speed);
                  let stopThreshold = currentSeg.end_time - leadCompensation;

                  // Lead-out Guard: Ensure stopThreshold triggers before nextSeg starts
                  if (nextSeg) {
                    stopThreshold = Math.min(stopThreshold, nextSeg.start_time - 0.08);
                  }

                  // 1. If already paused at sentence end -> enforce lockdown & freeze at stopThreshold
                  if (justPausedSegRef.current === curIdx) {
                    let isPlayerStillPlaying = false;
                    try {
                      if (playerRef.current && typeof playerRef.current.getPlayerState === "function") {
                        const state = playerRef.current.getPlayerState();
                        isPlayerStillPlaying = state === 1 || state === 3;
                      }
                    } catch {}

                    if (isPlayerStillPlaying || time > stopThreshold + 0.15) {
                      try {
                        playerRef.current?.pauseVideo();
                        playerRef.current?.seekTo(stopThreshold, false);
                      } catch {}
                    }

                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }

                  // 2. Unconditional seek grace window: allow YouTube player to seek & settle at new sentence without premature pause or rollback
                  if (Date.now() < seekGraceUntilRef.current) {
                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }

                  const isAtEndOfSentence = time >= stopThreshold;

                  // 3. Reached sentence end -> Trigger decisive pause!
                  if (isAtEndOfSentence) {
                    justPausedSegRef.current = curIdx;
                    setIsAutoPaused(true);
                    isAutoPausingRef.current = true;
                    if (autoPauseTimerRef.current) {
                      clearTimeout(autoPauseTimerRef.current);
                      autoPauseTimerRef.current = null;
                    }
                    pauseVideo();
                    try {
                      playerRef.current?.seekTo(stopThreshold, false);
                    } catch {}
                    if (typeof window !== "undefined") {
                      try {
                        window.focus();
                      } catch {}
                    }

                    animId = requestAnimationFrame(syncLoop);
                    return;
                  }

                  // 4. Manual backward seek catch-up only (e.g. user manually clicked back in timeline)
                  // NEVER auto-advance forward into the next segment in pause_after_sentence mode!
                  if (
                    Date.now() >= seekGraceUntilRef.current &&
                    time < currentSeg.start_time - 1.5 &&
                    justPausedSegRef.current === -1
                  ) {
                    const matchedIdx = segments.findIndex(
                      (seg) => time >= seg.start_time - 0.1 && time < seg.end_time + 0.1
                    );
                    if (matchedIdx !== -1 && matchedIdx !== curIdx) {
                      isSeekingJumpRef.current = true;
                      activeSegmentIndexRef.current = matchedIdx;
                      setActiveSegmentIndex(matchedIdx);
                      animId = requestAnimationFrame(syncLoop);
                      return;
                    }
                  }

                  // While playing inside current sentence, KEEP activeSegment locked to curIdx!
                  animId = requestAnimationFrame(syncLoop);
                  return;
                }

                // ─── Continuous Mode: High-Fidelity Lead-Compensated Sync ──
                // If currently in a seek grace window (e.g. user pressed next/prev or clicked a segment),
                // do NOT let continuous sync engine overwrite activeSegmentIndexRef with stale pre-seek time!
                if (Date.now() < seekGraceUntilRef.current) {
                  animId = requestAnimationFrame(syncLoop);
                  return;
                }
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
                  if (Math.abs(matchedIdx - activeSegmentIndexRef.current) > 1) {
                    isSeekingJumpRef.current = true;
                  }
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

  // ─── Smart Subtitle Center-Scroll & User Gesture Controls ───────────
  const scrollToActiveSegment = useCallback(
    (behavior: ScrollBehavior = "smooth", targetIdx?: number) => {
      const container = timelineContainerRef.current;
      const idx = targetIdx !== undefined ? targetIdx : activeSegmentIndexRef.current;
      const el = timelineItemRefs.current[idx];
      if (!container || !el) return;

      // Detect whether this is a natural 1-sentence step (playing normally or prev/next 1 step)
      // vs a Seek / Jump (>1 sentence difference or seek flag active)
      const isNaturalStep =
        Math.abs(idx - lastScrolledIndexRef.current) <= 1 && !isSeekingJumpRef.current;
      const effectiveBehavior: ScrollBehavior = isNaturalStep ? behavior : "auto";
      lastScrolledIndexRef.current = idx;
      isSeekingJumpRef.current = false;

      isProgrammaticScrollRef.current = true;
      if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, effectiveBehavior === "smooth" ? 700 : 50);

      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const delta =
        elRect.top - containerRect.top - (container.clientHeight - elRect.height) / 2;

      container.scrollTo({
        top: Math.max(0, container.scrollTop + delta),
        behavior: effectiveBehavior,
      });
    },
    []
  );

  const handleUserWheelOrTouch = useCallback(() => {
    isProgrammaticScrollRef.current = false;
    setIsDetachedFromActive(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsDetachedFromActive(false);
      scrollToActiveSegment("smooth");
    }, 3500);
  }, [scrollToActiveSegment]);

  const handleContainerScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    setIsDetachedFromActive(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsDetachedFromActive(false);
      scrollToActiveSegment("smooth");
    }, 3500);
  }, [scrollToActiveSegment]);

  const handleResumeAutoScroll = useCallback(() => {
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    setIsDetachedFromActive(false);
    scrollToActiveSegment("smooth");
  }, [scrollToActiveSegment]);

  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current);
    };
  }, []);

  // Auto-Scroll Subtitles into View (Center) as Video Plays
  useEffect(() => {
    if (currentView !== "studio") return;
    if (!isDetachedFromActive) {
      scrollToActiveSegment("smooth", activeSegmentIndex);
    }
    if (showSubtitleAccordion && accordionContainerRef.current) {
      const accContainer = accordionContainerRef.current;
      const accEl = accordionItemRefs.current[activeSegmentIndex];
      if (accContainer && accEl) {
        const isNaturalStep =
          Math.abs(activeSegmentIndex - lastScrolledIndexRef.current) <= 1 && !isSeekingJumpRef.current;
        const effectiveBehavior: ScrollBehavior = isNaturalStep ? "smooth" : "auto";
        const accContainerRect = accContainer.getBoundingClientRect();
        const accElRect = accEl.getBoundingClientRect();
        const delta =
          accElRect.top - accContainerRect.top - (accContainer.clientHeight - accElRect.height) / 2;
        accContainer.scrollTo({
          top: Math.max(0, accContainer.scrollTop + delta),
          behavior: effectiveBehavior,
        });
      }
    }
  }, [activeSegmentIndex, currentView, isDetachedFromActive, showSubtitleAccordion, scrollToActiveSegment]);

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
        "Video sẽ tự động dừng ở cuối mỗi câu. Bấm phím [→] hoặc nút Tiếp để sang câu sau, bấm [Space] để nghe lại."
      );
    } else if (current === "pause_after_sentence") {
      next = "loop_sentence";
      toast.info(
        "Chế độ: Lặp lại 1 câu",
        "Video sẽ tự động lặp lại liên tục câu hiện tại để luyện ngữ điệu sâu."
      );
      const cur = activeSegmentIndexRef.current;
      const seg = activeLesson?.segments?.[cur];
      if (seg && playerRef.current && typeof playerRef.current.seekTo === "function") {
        const prevSeg = activeLesson?.segments?.[cur - 1];
        const minBound = prevSeg ? prevSeg.end_time : 0;
        const targetTime = Math.max(minBound, Math.max(0, seg.start_time - 0.18));
        seekGraceUntilRef.current = Date.now() + 600;
        seekTargetTimeRef.current = targetTime;
        playerRef.current.seekTo(targetTime, true);
        playerRef.current.playVideo?.();
        setIsPlayingVideo(true);
      }
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
  }, [activeLesson?.segments]);

  const handleSelectPlayMode = useCallback((mode: ShadowingPlayMode) => {
    if (mode === "continuous") {
      toast.info(
        "Chế độ: Phát liên tục",
        "Video sẽ chạy liền mạch từ đầu tới cuối mà không dừng."
      );
    } else if (mode === "pause_after_sentence") {
      toast.info(
        "Chế độ: Dừng sau mỗi câu",
        "Video sẽ tự động dừng ở cuối mỗi câu. Bấm phím [→] hoặc nút Tiếp để sang câu sau, bấm [Space] để nghe lại."
      );
    } else if (mode === "loop_sentence") {
      toast.info(
        "Chế độ: Lặp lại 1 câu",
        "Video sẽ tự động lặp lại liên tục câu hiện tại để luyện ngữ điệu sâu."
      );
      const cur = activeSegmentIndexRef.current;
      const seg = activeLesson?.segments?.[cur];
      if (seg && playerRef.current && typeof playerRef.current.seekTo === "function") {
        const prevSeg = activeLesson?.segments?.[cur - 1];
        const minBound = prevSeg ? prevSeg.end_time : 0;
        const targetTime = Math.max(minBound, Math.max(0, seg.start_time - 0.18));
        seekGraceUntilRef.current = Date.now() + 600;
        seekTargetTimeRef.current = targetTime;
        playerRef.current.seekTo(targetTime, true);
        playerRef.current.playVideo?.();
        setIsPlayingVideo(true);
      }
    }

    playModeRef.current = mode;
    justPausedSegRef.current = -1;
    isAutoPausingRef.current = false;
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
    const sttProvider = settings.stt?.provider || "browser";
    if (shadowingRecordStatus === "recording") {
      soundEffects.playMicStop();
      speechRec.stopListening();
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
    setPopupWord(null);
    setPopupAnchor(null);
    if (shadowingAudioRef.current) {
      shadowingAudioRef.current.pause();
      shadowingAudioRef.current = null;
    }
    setIsPlayingShadowingAudio(false);
    setShadowingAudioUrl(null);
    setShadowingTranscript("");
    setShowShadowingPreview(true);
    speechRec.resetTranscript();

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
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      setIsDetachedFromActive(false);

      if (Math.abs(index - activeSegmentIndexRef.current) > 1) {
        isSeekingJumpRef.current = true;
      }

      setActiveSegmentIndex(index);
      activeSegmentIndexRef.current = index;
      justPausedSegRef.current = -1;
      setIsAutoPaused(false);
      isAutoPausingRef.current = false;
      isLoopSeekingRef.current = false;
      setScore(null);
      setUserAudioUrl(null);
      setSpokenTranscript("");
      setPopupWord(null);
      setPopupAnchor(null);
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
      setIsPlayingUserAudio(false);
      // Dừng nhận diện giọng nói & thu âm triệt để, giải phóng microphone khi chuyển câu
      speechRec.stopListening();
      speechRec.resetTranscript();

      // Reset Shadowing mode audio preview & recording, release mic
      try {
        recorder.cancel();
      } catch {}
      setShadowingAudioUrl(null);
      setShadowingTranscript("");
      setShowShadowingPreview(false);
      if (shadowingAudioRef.current) {
        shadowingAudioRef.current.pause();
        shadowingAudioRef.current = null;
      }
      setIsPlayingShadowingAudio(false);
      setShadowingRecordStatus("idle");
      setRecordingStatus("idle");

      const seg = activeLesson.segments[index];
      const prevSeg = activeLesson.segments[index - 1];

      // Smart Pre-roll Buffer: Seek ~0.18s early so YouTube audio decoder un-mutes
      // and buffers cleanly before speech begins, without cutting off initial consonants or words.
      // Bounded so it never seeks backwards into the previous sentence's audio.
      const minBound = prevSeg ? prevSeg.end_time : 0;
      const preRollTime = Math.max(minBound, Math.max(0, seg.start_time - 0.18));

      seekGraceUntilRef.current = Date.now() + 800;
      seekTargetTimeRef.current = preRollTime;

      // Save progress immediately on segment change
      if (activeLessonRef.current?.youtubeId && activeLessonRef.current.youtubeId !== "custom") {
        saveVideoProgress(activeLessonRef.current.youtubeId, {
          currentTime: preRollTime,
          segmentIndex: index,
        });
      }

      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(preRollTime, true);
        if (autoPlay) {
          playerRef.current.playVideo();
          setIsPlayingVideo(true);
        }
      }
    },
    [activeLesson.segments, speechRec, recorder]
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

      // Ngắt thu âm và nhận diện giọng nói nếu bấm Play video
      if (shadowingRecordStatus === "recording") {
        speechRec.stopListening();
        try {
          recorder.cancel();
        } catch {}
        setShadowingRecordStatus("idle");
      }
      if (recordingStatus === "recording") {
        speechRec.stopListening();
        try {
          recorder.cancel();
        } catch {}
        setRecordingStatus("idle");
      }

      const cur = activeSegmentIndexRef.current;
      const currentSeg = activeLesson.segments[cur];

      if (
        (playModeRef.current === "pause_after_sentence" &&
          (justPausedSegRef.current !== -1 ||
            isAutoPaused ||
            (currentSeg && currentTime >= currentSeg.end_time - 0.2))) ||
        (playModeRef.current === "loop_sentence" &&
          currentSeg &&
          currentTime >= currentSeg.end_time - 0.2)
      ) {
        // Paused at end of sentence -> Replay current sentence from the beginning!
        justPausedSegRef.current = -1;
        setIsAutoPaused(false);
        isAutoPausingRef.current = false;
        seekToSegment(cur, true);
      } else {
        playVideo();
      }
    }
  }, [
    isPlayingVideo,
    isAutoPaused,
    currentTime,
    activeLesson.segments,
    pauseVideo,
    playVideo,
    seekToSegment,
    shadowingRecordStatus,
    recordingStatus,
    recorder,
    speechRec,
  ]);

  const handlePlayNative = useCallback(() => {
    seekToSegment(activeSegmentIndexRef.current, true);
    reclaimFocus();
  }, [seekToSegment, reclaimFocus]);

  const handlePrevSegment = useCallback(() => {
    setPopupWord(null);
    setPopupAnchor(null);
    const cur = activeSegmentIndexRef.current;
    if (cur > 0) {
      seekToSegment(cur - 1, true);
      reclaimFocus();
    }
  }, [seekToSegment, reclaimFocus]);

  const handleNextSegment = useCallback(() => {
    setPopupWord(null);
    setPopupAnchor(null);
    const cur = activeSegmentIndexRef.current;
    if (cur < activeLesson.segments.length - 1) {
      seekToSegment(cur + 1, true);
      reclaimFocus();
    } else {
      setShowCompletedModal(true);
    }
  }, [activeLesson.segments.length, seekToSegment, reclaimFocus]);

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
    setPopupWord(null);
    setPopupAnchor(null);
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
    speechRec.stopListening();
    setRecordingStatus("evaluating");
    const sttProvider = settings.stt?.provider || "browser";

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
          // In Shadowing mode: Enter key advances to the next segment
          handleNextSegment();
        }
      } else if (e.code === "KeyR" || e.key === "r" || e.key === "R") {
        e.preventDefault();
        handlePlayNative();
      } else if (
        e.code === "ArrowLeft" ||
        e.key === "ArrowLeft" ||
        e.code === "BracketLeft"
      ) {
        e.preventDefault();
        handlePrevSegment();
      } else if (
        e.code === "ArrowRight" ||
        e.key === "ArrowRight" ||
        e.code === "BracketRight"
      ) {
        e.preventDefault();
        handleNextSegment();
      } else if (
        (e.code === "KeyM" || e.key === "m" || e.key === "M") &&
        activeMode === "shadowing"
      ) {
        e.preventDefault();
        handleToggleShadowingRecord();
      } else if (
        (e.code === "KeyL" || e.key === "l" || e.key === "L") &&
        activeMode === "shadowing"
      ) {
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

  // ─── Multi-Layer Focus Reclaiming for Hotkeys & Tab Switching ────────
  useEffect(() => {
    if (currentView !== "studio") return;

    const handleWindowFocus = () => {
      reclaimFocusRef.current?.();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        reclaimFocusRef.current?.();
        setTimeout(() => {
          reclaimFocusRef.current?.();
        }, 150);
      }
    };

    const handleWindowBlur = () => {
      // If focus was stolen by an iframe, reclaim it after a short delay
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
  }, [currentView]);

  // ─── Word Lookup Handler ─────────────────────────────────────────────
  const handleWordClick = async (word: string, e?: React.MouseEvent<HTMLElement>) => {
    // Automatically pause video so the pronunciation can be clearly heard without overlap
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

    // 1. Check synchronous Oxford 5000 Lexicon (0ms instant match)
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

    // 2. Not in Oxford 5000: derive IPA instantly and display popup with micro-shimmer
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

    // 3. Asynchronously fetch from the 103k offline dictionary (~2-5ms)
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

      if (existingLesson) {
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

      let resolvedChannel = (data.channel || "YouTube").trim();
      if (modalTargetChannel !== "auto" && modalTargetChannel.trim()) {
        if (modalTargetChannel === "__new__") {
          if (modalCustomChannelName.trim()) {
            resolvedChannel = modalCustomChannelName.trim();
          }
        } else {
          resolvedChannel = modalTargetChannel.trim();
        }
      }

      const loadedLesson: CorodomoVideoLesson = {
        id: `custom_${videoId}`,
        youtubeId: videoId,
        title: data.title || `YouTube Video (${videoId})`,
        channel: resolvedChannel,
        cefrLevel: "Custom",
        playlistName: resolvedChannel,
        playlistId: `custom_pl_${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: data.duration || "10:00",
        publishedAt: data.publishedAt,
        publishedText: data.publishedText || (data.publishedAt ? formatRelativeTime(data.publishedAt) : undefined),
        segments: mergeFragmentedSegments(
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
        ),
      };

      let startIdx = 0;
      let resumeTime = 0;
      if (loadedLesson.youtubeId) {
        const progress = getVideoProgress(loadedLesson.youtubeId);
        if (progress && (progress.currentTime > 2 || progress.segmentIndex > 0)) {
          const lastSeg = loadedLesson.segments[loadedLesson.segments.length - 1];
          const isAtEnd = lastSeg && progress.currentTime >= lastSeg.end_time - 1;
          if (!isAtEnd) {
            startIdx = Math.min(progress.segmentIndex, Math.max(0, loadedLesson.segments.length - 1));
            resumeTime = progress.currentTime;
          }
        }
      }

      initialResumeTimeRef.current = resumeTime;
      setActiveLesson(loadedLesson);
      setActiveSegmentIndex(startIdx);
      activeSegmentIndexRef.current = startIdx;
      seekGraceUntilRef.current = Date.now() + 1000;
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
      setModalTargetChannel("auto");
      setModalCustomChannelName("");
      setShowAddVideoModal(false);

      // Save transcript to IndexedDB
      await saveTranscript(videoId, loadedLesson.segments);

      // Save to video library (Create)
      const updatedLib = addVideoToLibrary(loadedLesson);
      setVideoLibrary(updatedLib);
      router.push(`/shadowing/video/${videoId}`);

      if (resumeTime > 0) {
        toast.custom({
          type: "info",
          title: "Tiếp tục bài học",
          description: `Đang ở ${formatPlaybackTime(resumeTime)} (Câu ${startIdx + 1})`,
          durationMs: 6000,
          action: {
            label: "Học lại từ đầu",
            onClick: () => {
              handleRestartFromBeginning(loadedLesson.youtubeId);
            },
          },
        });
      } else {
        toast.success("Nạp video thành công!", `Đã lưu vào thư viện với ${loadedLesson.segments.length} câu phụ đề.`);
      }
    } catch (err: unknown) {
      toast.error("Không thể lấy phụ đề", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingCustomUrl(false);
    }
  };

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

  const openStudioSession = useCallback(
    (lesson: CorodomoVideoLesson, targetIdx: number, targetTime: number) => {
      initialResumeTimeRef.current = targetTime;
      setActiveLesson(lesson);
      setActiveSegmentIndex(targetIdx);
      activeSegmentIndexRef.current = targetIdx;
      seekGraceUntilRef.current = Date.now() + 1000;
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

      // Save initial progress record immediately upon opening lesson so it appears in history
      if (lesson.youtubeId && lesson.youtubeId !== "custom") {
        saveVideoProgress(lesson.youtubeId, {
          currentTime: targetTime,
          segmentIndex: targetIdx,
        });
        setHistoryRefreshKey((k) => k + 1);
      }

      if (targetTime > 0) {
        toast.custom({
          type: "info",
          title: "Tiếp tục bài học",
          description: `Đang ở ${formatPlaybackTime(targetTime)} (Câu ${targetIdx + 1})`,
          durationMs: 4000,
          action: {
            label: "Học lại từ đầu",
            onClick: () => {
              handleRestartFromBeginning(lesson.youtubeId);
            },
          },
        });
      } else {
        toast.success("Đã mở bài học!", lesson.title);
      }
    },
    [handleRestartFromBeginning]
  );

  const handleSelectLesson = useCallback(
    (lesson: CorodomoVideoLesson) => {
      const targetId = lesson.youtubeId || lesson.id;
      if (targetId) {
        router.push(`/shadowing/video/${targetId}`);
      }
    },
    [router]
  );

  const handleConfirmResume = useCallback(() => {
    if (!cornerResumePrompt) return;
    seekToSegment(cornerResumePrompt.segmentIndex, false);
    setCornerResumePrompt(null);
    toast.info("Tiếp tục bài học", `Tiếp tục học từ câu ${cornerResumePrompt.segmentIndex + 1}/${cornerResumePrompt.totalSegments}`);
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

  const handlePickRandomVideo = useCallback(() => {
    if (filteredLibrary.length === 0) {
      toast.error("Không có bài học", "Vui lòng bỏ bớt bộ lọc để có video chọn ngẫu nhiên.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredLibrary.length);
    const chosen = filteredLibrary[randomIndex];
    toast.custom({
      type: "info",
      title: "🎲 Đã chọn video ngẫu nhiên!",
      description: chosen.title,
      durationMs: 4000,
    });
    handleSelectLesson(chosen);
  }, [filteredLibrary, handleSelectLesson]);

  const handleBackToHub = useCallback(() => {
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
        setHistoryRefreshKey((k) => k + 1);
      }
    }
    setCornerResumePrompt(null);
    setCurrentView("hub");
  }, [pauseVideo]);

  // Save progress on tab close or refresh
  useEffect(() => {
    const handleSaveOnExit = () => {
      if (
        activeLessonRef.current?.youtubeId &&
        activeLessonRef.current.youtubeId !== "custom"
      ) {
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
    };

    window.addEventListener("beforeunload", handleSaveOnExit);
    window.addEventListener("pagehide", handleSaveOnExit);
    return () => {
      window.removeEventListener("beforeunload", handleSaveOnExit);
      window.removeEventListener("pagehide", handleSaveOnExit);
      handleSaveOnExit();
    };
  }, []);

  // ─── Paste from Clipboard Helper ────────────────────────────────────
  const handlePasteClipboard = async (target: "custom" | "modalSingle" | "modalChannel" | boolean = false) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (target === "modalChannel") {
          setChannelUrlInput(text.trim());
        } else if (target === "modalSingle" || target === true) {
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
              title="Chế độ: Dừng sau mỗi câu để bạn nói theo (Bấm Space để nghe lại, Enter hoặc phím → để sang câu tiếp)"
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
              title="Chế độ: Lặp lại liên tục 1 câu hiện tại (Bấm [→] hoặc Enter để sang câu tiếp theo, Space để tạm dừng)"
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
            onClick={handleBackToHub}
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
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          ref={timelineContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1"
          onWheel={handleUserWheelOrTouch}
          onTouchMove={handleUserWheelOrTouch}
          onScroll={handleContainerScroll}
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

        {/* Floating Button: "Cuộn về câu đang phát" */}
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
        <div className="w-full px-2 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 animate-in fade-in-0 duration-200">
          {/* ── DUAL TAB & SLEEK NAVIGATION TOOLBAR ── */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card/80 backdrop-blur-md border border-border/70 rounded-2xl p-2 sm:p-2.5 shadow-xs">
            {/* Left: Back + Hub Title + [Kho bài học] / [Lịch sử] Pill Tabs */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
                  title="Quay lại Trang chủ"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>

              <div className="flex items-center gap-1.5 shrink-0 pr-1 border-r border-border/60">
                <Film className="size-4.5 text-primary" />
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground">
                  Shadowing
                </h1>
              </div>

              {/* View Switch: [Kho bài học] | [Lịch sử (YouTube style)] */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
                <button
                  onClick={() => setHubSubView("library")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    hubSubView === "library"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Library className="size-3.5" />
                  <span>Kho bài học</span>
                  <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1 font-bold ml-0.5">
                    {isMounted ? videoLibrary.length : 0}
                  </Badge>
                </button>

                <button
                  onClick={() => setHubSubView("history")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    hubSubView === "history"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Clock className="size-3.5 text-red-500" />
                  <span>Lịch sử</span>
                  {isMounted && historyItems.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1 font-bold ml-0.5 bg-red-500/15 text-red-600 dark:text-red-400">
                      {historyItems.length}
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Actions depending on Hub sub-view */}
            {hubSubView === "library" ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                {/* Random Video Button - Bốc thăm 1 bài vào học ngay */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePickRandomVideo}
                  disabled={filteredLibrary.length === 0}
                  className="h-8 px-2.5 sm:px-3 text-xs font-bold gap-1.5 rounded-xl border border-amber-500/35 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/60 shadow-xs transition-all shrink-0"
                  title="Bốc ngẫu nhiên một bài học từ danh sách để vào Studio luyện tập ngay"
                >
                  <Dices className="size-3.5" />
                  <span>Random Video</span>
                </Button>

                {/* Shuffle List Order Button */}
                <Button
                  size="sm"
                  variant={isShuffled ? "default" : "outline"}
                  onClick={handleShuffleLibrary}
                  className={cn(
                    "h-8 px-2.5 text-xs font-bold gap-1.5 rounded-xl border shrink-0 transition-all",
                    isShuffled
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground border-primary shadow-xs"
                      : "border-border/80 text-foreground hover:bg-muted"
                  )}
                  title="Xáo trộn ngẫu nhiên thứ tự các thẻ bài học trên màn hình"
                >
                  <Shuffle className="size-3.5" />
                  <span className="hidden xs:inline">{isShuffled ? "Xáo lại" : "Xáo trộn"}</span>
                </Button>

                {isShuffled && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleResetShuffle}
                    className="size-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
                    title="Khôi phục thứ tự danh sách ban đầu"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}

                {/* Search Bar */}
                <div className="relative w-32 sm:w-44 lg:w-52">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Tìm bài học, kênh..."
                    className="h-8 pl-8 pr-7 text-xs rounded-xl bg-background border-border/70 focus-visible:ring-1 focus-visible:ring-primary"
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

                {/* Channel Sync & New Videos Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowChannelSyncModal(true)}
                  className="h-8 px-2.5 sm:px-3 text-xs font-bold gap-1.5 rounded-xl border-border/80 text-foreground hover:bg-muted shrink-0 relative"
                  title="Quét video mới từ các kênh theo dõi & cài đặt tự động hàng ngày"
                >
                  <Radio className={cn("size-3.5 text-red-500", isSyncingChannels && "animate-pulse")} />
                  <span className="hidden md:inline">Quét video mới</span>
                  {newDiscoveredVideos.length > 0 && (
                    <span className="size-2 rounded-full bg-red-500 absolute -top-0.5 -right-0.5 animate-ping" />
                  )}
                </Button>

                {/* Add Video Button (Opens Modal) */}
                <Button
                  size="sm"
                  onClick={() => setShowAddVideoModal(true)}
                  className="h-8 px-2.5 sm:px-3 text-xs font-bold gap-1.5 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 shadow-xs shrink-0"
                >
                  <PlusCircle className="size-3.5" />
                  <span>Thêm video</span>
                </Button>

                {/* Continue Last Active Lesson Button */}
                {isMounted && activeLesson && activeLesson.id !== "" && activeLesson.youtubeId !== "" && (
                  <Button
                    size="sm"
                    onClick={() => handleSelectLesson(activeLesson)}
                    className="h-8 px-2.5 sm:px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-xl shadow-xs shrink-0"
                    title={`Tiếp tục: ${activeLesson.title}`}
                  >
                    <Play className="size-3 fill-current" />
                    <span className="hidden sm:inline">Học tiếp</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHubSubView("library")}
                  className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-xl"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Về Thư viện</span>
                </Button>
                {historyItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllHistory}
                    className="h-8 px-2.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 rounded-xl"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Xóa toàn bộ lịch sử</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── 1. HORIZONTAL CHANNEL CAROUSEL BAR (Trượt ngang các kênh YouTube) ── */}
          {hubSubView === "library" && channelStats.length > 0 && (
            <div className="relative flex items-center gap-1.5 sm:gap-2">
                {/* Scroll Left Button */}
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => handleScrollChannel("left")}
                    className="size-8 rounded-full bg-background/95 hover:bg-background border border-border shadow-md flex items-center justify-center text-foreground shrink-0 transition-all z-10 hover:scale-105 active:scale-95 cursor-pointer"
                    title="Cuộn sang trái"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                )}

                {/* Horizontal Scrolling Chips Container */}
                <div
                  ref={channelScrollRef}
                  onScroll={checkChannelScroll}
                  onWheel={(e) => {
                    if (e.deltaY !== 0 && channelScrollRef.current) {
                      channelScrollRef.current.scrollLeft += e.deltaY;
                      checkChannelScroll();
                    }
                  }}
                  className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 scroll-smooth flex-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {/* "Tất cả kênh" Chip */}
                  <button
                    type="button"
                    onClick={() => handleSelectChannel("all")}
                    className={cn(
                      "h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 border select-none cursor-pointer",
                      selectedChannelFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background hover:bg-muted text-foreground/80 border-border/80 hover:border-border"
                    )}
                  >
                    <Layers className="size-3.5" />
                    <span>Tất cả kênh</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        selectedChannelFilter === "all"
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted-foreground/15 text-muted-foreground"
                      )}
                    >
                      {videoLibrary.length}
                    </span>
                  </button>

                  {/* Individual Channel Chips */}
                  {channelStats.map((ch) => {
                    const isSelected =
                      selectedChannelFilter.trim().toLowerCase() === ch.channelName.trim().toLowerCase();
                    return (
                      <div
                        key={ch.channelName}
                        onClick={() => handleSelectChannel(ch.channelName)}
                        className={cn(
                          "group/chip h-8 pl-2.5 pr-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all flex items-center gap-2 border cursor-pointer select-none",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                            : "bg-background hover:bg-muted text-foreground/80 border-border/80 hover:border-border"
                        )}
                        title={ch.channelName}
                      >
                        {/* Channel Avatar / Initial */}
                        {ch.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ch.thumbnail}
                            alt={ch.channelName}
                            className="size-5 rounded-full object-cover shrink-0 border border-white/20"
                          />
                        ) : (
                          <span
                            className={cn(
                              "size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            {ch.channelName.charAt(0).toUpperCase()}
                          </span>
                        )}

                        {/* Channel Name */}
                        <span className="max-w-[140px] sm:max-w-[180px] truncate">
                          {ch.channelName}
                        </span>

                        {/* Video Count */}
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0",
                            isSelected
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted-foreground/15 text-muted-foreground"
                          )}
                        >
                          {ch.count}
                        </span>

                        {/* Delete Channel Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChannelToDelete({
                              channelName: ch.channelName,
                              videoCount: ch.count,
                            });
                          }}
                          className={cn(
                            "size-5 rounded-full flex items-center justify-center transition-all opacity-60 group-hover/chip:opacity-100 shrink-0 cursor-pointer",
                            isSelected
                              ? "hover:bg-rose-500 hover:text-white text-primary-foreground/80"
                              : "hover:bg-rose-500/20 text-muted-foreground hover:text-rose-500"
                          )}
                          title={`Xóa kênh "${ch.channelName}" & toàn bộ video`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Scroll Right Button */}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => handleScrollChannel("right")}
                    className="size-8 rounded-full bg-background/95 hover:bg-background border border-border shadow-md flex items-center justify-center text-foreground shrink-0 transition-all z-10 hover:scale-105 active:scale-95 cursor-pointer"
                    title="Cuộn sang phải"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                )}
            </div>
          )}

          {/* ── FILTER TOOLBAR (Kênh, Thời lượng, Ngày đăng, Trạng thái) - CHỈ KHI Ở TAB THƯ VIỆN ── */}
          {hubSubView === "library" && (
            <>
              {/* Transparent Backdrop to completely prevent any click bleed-through to video cards */}
              {activeFilterDropdown && (
                <div
                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFilterDropdown(null);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setActiveFilterDropdown(null);
                  }}
                />
              )}

              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 text-xs bg-muted/20 border border-border/60 rounded-2xl p-2.5 relative backdrop-blur-xs transition-all",
                  activeFilterDropdown ? "z-50" : "z-20"
                )}
              >
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 shrink-0 mr-1 select-none">
                <SlidersHorizontal className="size-3.5 text-primary/80" />
                <span>Bộ lọc:</span>
              </span>


              {/* Pill 2: Thời lượng Filter (Custom Min-Max Range & Presets) */}
              <div className="relative" data-filter-dropdown="duration">
                <button
                  type="button"
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === "duration" ? null : "duration")}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border select-none",
                    selectedDurationFilter !== "all"
                      ? "bg-primary/10 text-primary border-primary/30 font-semibold shadow-xs"
                      : "bg-background hover:bg-muted/70 text-foreground/80 border-border/80 hover:border-border"
                  )}
                >
                  <Clock className="size-3 text-muted-foreground" />
                  <span>{getDurationFilterLabel()}</span>
                  {selectedDurationFilter !== "all" ? (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDurationFilter("all");
                        setCustomDurationMin("");
                        setCustomDurationMax("");
                      }}
                      className="size-4 rounded-full flex items-center justify-center hover:bg-primary/20 text-primary ml-0.5"
                      title="Bỏ lọc thời lượng"
                    >
                      <X className="size-2.5" />
                    </span>
                  ) : (
                    <ChevronDown
                      className={cn(
                        "size-3 text-muted-foreground transition-transform duration-200",
                        activeFilterDropdown === "duration" && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {activeFilterDropdown === "duration" && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-2 z-50 w-[270px] bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-2.5 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                      Cài đặt sẵn
                    </div>
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDurationFilter("all");
                          setCustomDurationMin("");
                          setCustomDurationMax("");
                          setActiveFilterDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                          selectedDurationFilter === "all"
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted/80 text-foreground"
                        )}
                      >
                        <span>Mọi thời lượng</span>
                        {selectedDurationFilter === "all" && <Check className="size-3.5 text-primary" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDurationFilter("short");
                          setActiveFilterDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                          selectedDurationFilter === "short"
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted/80 text-foreground"
                        )}
                      >
                        <span>&lt; 3 phút (Ngắn)</span>
                        {selectedDurationFilter === "short" && <Check className="size-3.5 text-primary" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDurationFilter("medium");
                          setActiveFilterDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                          selectedDurationFilter === "medium"
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted/80 text-foreground"
                        )}
                      >
                        <span>3 - 10 phút (Vừa)</span>
                        {selectedDurationFilter === "medium" && <Check className="size-3.5 text-primary" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDurationFilter("long");
                          setActiveFilterDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                          selectedDurationFilter === "long"
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted/80 text-foreground"
                        )}
                      >
                        <span>&gt; 10 phút (Dài)</span>
                        {selectedDurationFilter === "long" && <Check className="size-3.5 text-primary" />}
                      </button>
                    </div>

                    {/* Custom Duration Range: Từ [Min] đến [Max] phút */}
                    <div className="mt-2.5 pt-2.5 border-t border-border/60">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 pb-1.5">
                        Khoảng tùy chỉnh (phút)
                      </div>
                      <div className="flex items-center gap-1.5 px-1">
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Từ</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="0"
                            value={customDurationMin}
                            onChange={(e) => {
                              setCustomDurationMin(e.target.value);
                              setSelectedDurationFilter("custom");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (customDurationMin.trim() || customDurationMax.trim()) {
                                  setSelectedDurationFilter("custom");
                                }
                                setActiveFilterDropdown(null);
                              }
                            }}
                            className="w-full h-8 px-2 text-xs rounded-lg bg-background border border-border/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground pt-4">-</span>
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Đến</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="10"
                            value={customDurationMax}
                            onChange={(e) => {
                              setCustomDurationMax(e.target.value);
                              setSelectedDurationFilter("custom");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (customDurationMin.trim() || customDurationMax.trim()) {
                                  setSelectedDurationFilter("custom");
                                }
                                setActiveFilterDropdown(null);
                              }
                            }}
                            className="w-full h-8 px-2 text-xs rounded-lg bg-background border border-border/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="mt-2.5 px-1 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (customDurationMin.trim() || customDurationMax.trim()) {
                              setSelectedDurationFilter("custom");
                            }
                            setActiveFilterDropdown(null);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors text-center shadow-xs"
                        >
                          Áp dụng
                        </button>
                        {selectedDurationFilter === "custom" && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomDurationMin("");
                              setCustomDurationMax("");
                              setSelectedDurationFilter("all");
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                          >
                            Đặt lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pill 3: Thời gian đăng & Sắp xếp Filter */}
              <div className="relative" data-filter-dropdown="uploadDate">
                <button
                  type="button"
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === "uploadDate" ? null : "uploadDate")}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border select-none",
                    selectedUploadDateFilter !== "all" || selectedSortOrder !== "newest"
                      ? "bg-primary/10 text-primary border-primary/30 font-semibold shadow-xs"
                      : "bg-background hover:bg-muted/70 text-foreground/80 border-border/80 hover:border-border"
                  )}
                >
                  <Calendar className="size-3 text-muted-foreground" />
                  <span>{getUploadDateFilterLabel()}</span>
                  {selectedUploadDateFilter !== "all" || selectedSortOrder !== "newest" ? (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUploadDateFilter("all");
                        setSelectedSortOrder("newest");
                      }}
                      className="size-4 rounded-full flex items-center justify-center hover:bg-primary/20 text-primary ml-0.5"
                      title="Khôi phục sắp xếp mới nhất"
                    >
                      <X className="size-2.5" />
                    </span>
                  ) : (
                    <ChevronDown
                      className={cn(
                        "size-3 text-muted-foreground transition-transform duration-200",
                        activeFilterDropdown === "uploadDate" && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {activeFilterDropdown === "uploadDate" && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-2 z-50 w-[240px] bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Nhóm 1: Sắp xếp thứ tự */}
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpDown className="size-3" />
                      <span>Thứ tự sắp xếp</span>
                    </div>
                    <div className="space-y-0.5">
                      {[
                        { key: "newest" as const, label: "Mới nhất (Mặc định - YouTube)" },
                        { key: "oldest" as const, label: "Cũ nhất" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSortOrder(opt.key);
                            setIsShuffled(false);
                            setShuffledOrder([]);
                            setActiveFilterDropdown(null);
                            toast.info(`Đã sắp xếp: ${opt.key === "newest" ? "Mới nhất (YouTube)" : "Cũ nhất"}`);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                            selectedSortOrder === opt.key
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-muted/80 text-foreground"
                          )}
                        >
                          <span>{opt.label}</span>
                          {selectedSortOrder === opt.key && <Check className="size-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>

                    <div className="my-1.5 border-t border-border/60" />

                    {/* Nhóm 2: Khoảng thời gian đăng */}
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="size-3" />
                      <span>Khoảng thời gian đăng</span>
                    </div>
                    <div className="space-y-0.5">
                      {[
                        { key: "all" as const, label: "Mọi thời gian" },
                        { key: "today" as const, label: "Hôm nay (24h)" },
                        { key: "this_week" as const, label: "Tuần này (7 ngày)" },
                        { key: "this_month" as const, label: "Tháng này (30 ngày)" },
                        { key: "this_year" as const, label: "Năm nay" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUploadDateFilter(opt.key);
                            setActiveFilterDropdown(null);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                            selectedUploadDateFilter === opt.key
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-muted/80 text-foreground"
                          )}
                        >
                          <span>{opt.label}</span>
                          {selectedUploadDateFilter === opt.key && <Check className="size-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pill 4: Trạng thái học Filter */}
              <div className="relative" data-filter-dropdown="status">
                <button
                  type="button"
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === "status" ? null : "status")}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border select-none",
                    selectedStatusFilter !== "all"
                      ? "bg-primary/10 text-primary border-primary/30 font-semibold shadow-xs"
                      : "bg-background hover:bg-muted/70 text-foreground/80 border-border/80 hover:border-border"
                  )}
                >
                  <Sparkles className="size-3 text-muted-foreground" />
                  <span>{getStatusFilterLabel()}</span>
                  {selectedStatusFilter !== "all" ? (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatusFilter("all");
                      }}
                      className="size-4 rounded-full flex items-center justify-center hover:bg-primary/20 text-primary ml-0.5"
                      title="Bỏ lọc trạng thái"
                    >
                      <X className="size-2.5" />
                    </span>
                  ) : (
                    <ChevronDown
                      className={cn(
                        "size-3 text-muted-foreground transition-transform duration-200",
                        activeFilterDropdown === "status" && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {activeFilterDropdown === "status" && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-2 z-50 w-[190px] bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {[
                      { key: "all", label: "Mọi trạng thái" },
                      { key: "in_progress", label: "Đang học dở" },
                      { key: "not_started", label: "Chưa học" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStatusFilter(opt.key);
                          setActiveFilterDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors",
                          selectedStatusFilter === opt.key
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted/80 text-foreground"
                        )}
                      >
                        <span>{opt.label}</span>
                        {selectedStatusFilter === opt.key && <Check className="size-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear active filters button */}
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-auto shrink-0"
                  title="Xóa tất cả các bộ lọc đang áp dụng"
                >
                  <X className="size-3" />
                  <span>Xóa bộ lọc ({activeFilterCount})</span>
                </button>
              )}
            </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SUBVIEW 1: KHO BÀI HỌC (THƯ VIỆN)
          ══════════════════════════════════════════════════════════════════ */}
          {hubSubView === "library" && (
            <>
              {filteredLibrary.length === 0 ? (
                <div className="p-10 rounded-3xl border border-dashed border-border/80 text-center flex flex-col items-center justify-center space-y-2 bg-card/30">
                  <Library className="size-10 text-muted-foreground/40" />
                  <p className="font-bold text-sm text-foreground">Không tìm thấy bài học nào phù hợp</p>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {isAnyFilterActive
                      ? "Hãy thử nới lỏng hoặc xóa các bộ lọc hiện tại."
                      : "Kho video đang trống. Hãy bấm 'Thêm video' để nạp bài học mới từ YouTube."}
                  </p>
                  {isAnyFilterActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAllFilters}
                      className="h-8 text-xs rounded-xl mt-2 gap-1.5"
                    >
                      <RotateCcw className="size-3" />
                      <span>Xóa toàn bộ lọc</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4">
                  {filteredLibrary.map((item) => {
                    const progress = getVideoProgress(item.youtubeId);
                    const hasProgress = progress && (progress.currentTime > 2 || progress.segmentIndex > 0);
                    const durSec = parseDurationSec(item.duration) || 300;
                    const progressPercent = hasProgress
                      ? Math.min(100, Math.max(5, Math.round((progress.currentTime / durSec) * 100)))
                      : 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectLesson(item)}
                        className="group relative flex flex-col rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-0.5 select-none"
                      >
                        {/* Thumbnail 16:9 */}
                        <div className="relative aspect-video w-full overflow-hidden bg-black/50 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            loading="lazy"
                          />

                          {/* YouTube-Style Red Progress Bar on Bottom of Thumbnail */}
                          {hasProgress && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 overflow-hidden z-10">
                              <div
                                className="h-full bg-red-600 rounded-r-full"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          )}

                          {/* Top Right: Hover Glassmorphism Actions (Edit & Delete) */}
                          <div
                            className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleOpenEditModal(item, e)}
                              className="size-6 rounded-lg text-white/80 hover:text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                              title="Chỉnh sửa thông tin"
                            >
                              <Pencil className="size-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteFromLibrary(item.id, e)}
                              className="size-6 rounded-lg text-white/80 hover:text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                              title="Xóa khỏi thư viện"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>

                          {/* Bottom Right: Duration Badge */}
                          <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/80 backdrop-blur-sm text-white/95 shadow-sm">
                            {item.duration || "00:00"}
                          </div>

                          {/* Bottom Left: Sentence Count / Progress */}
                          <div className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-sm text-white/90">
                            {hasProgress ? `Đang học (${progressPercent}%)` : `${item.segments?.length || 0} câu`}
                          </div>

                          {/* Center Play Overlay on Hover */}
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="size-11 rounded-full bg-primary/95 text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30 scale-90 group-hover:scale-100 transition-transform duration-200">
                              <Play className="size-4.5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-3 flex flex-col justify-between flex-1 gap-1.5">
                          <h4
                            className="font-bold text-xs sm:text-[13px] text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
                            title={item.title}
                          >
                            {item.title}
                          </h4>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 mt-auto">
                            <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                              <span className="truncate font-medium" title={item.channel}>
                                {item.channel}
                              </span>
                              {(item.publishedText || item.publishedAt) && (
                                <>
                                  <span className="text-muted-foreground/40 text-[10px]">•</span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground/80">
                                    {item.publishedText || formatRelativeTime(item.publishedAt)}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                              <span>Luyện ngay</span>
                              <ChevronRight className="size-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SUBVIEW 2: LỊCH SỬ HỌC TẬP (YOUTUBE-STYLE HISTORY VIEW)
          ══════════════════════════════════════════════════════════════════ */}
          {hubSubView === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-5 text-red-500" />
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-foreground">
                      Lịch sử học tập
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Các bài học đã ghi nhận thời gian luyện tập. Nhấn để tiếp tục đúng vị trí trước đó.
                    </p>
                  </div>
                </div>
              </div>

              {historyItems.length === 0 ? (
                <div className="p-12 rounded-3xl border border-dashed border-border/80 text-center flex flex-col items-center justify-center space-y-3 bg-card/30">
                  <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                    <Clock className="size-6" />
                  </div>
                  <p className="font-bold text-sm text-foreground">Chưa có bài học nào trong lịch sử</p>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Khi bạn mở bất kỳ bài học nào và luyện tập, hệ thống sẽ tự động lưu lại thời gian để bạn có thể học tiếp bất cứ lúc nào.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setHubSubView("library")}
                    className="rounded-xl text-xs mt-2"
                  >
                    Khám phá Thư viện bài học
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historyItems.map((item) => {
                    const durSec = parseDurationSec(item.lesson.duration) || 300;
                    const percent = Math.min(100, Math.max(5, Math.round((item.currentTime / durSec) * 100)));

                    return (
                      <div
                        key={item.youtubeId}
                        onClick={() => handleSelectLesson(item.lesson)}
                        className="group relative flex gap-3.5 p-3 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
                      >
                        {/* Thumbnail with YouTube Red Progress Bar */}
                        <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-black/60 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.lesson.thumbnail}
                            alt={item.lesson.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {/* YouTube Red Bar */}
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 z-10">
                            <div className="h-full bg-red-600 rounded-r-full" style={{ width: `${percent}%` }} />
                          </div>
                          {/* Duration */}
                          <div className="absolute bottom-2.5 right-1.5 z-10 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-black/80 text-white">
                            {item.lesson.duration || formatPlaybackTime(durSec)}
                          </div>
                          {/* Center Play Icon */}
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                              <Play className="size-3.5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Metadata & Actions */}
                        <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                          <div className="space-y-1">
                            <h4
                              className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
                              title={item.lesson.title}
                            >
                              {item.lesson.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.lesson.channel}
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Badge variant="outline" className="text-[10px] font-mono h-4 px-1 text-primary border-primary/30">
                                Đang ở {formatPlaybackTime(item.currentTime)}
                              </Badge>
                              {item.segmentIndex > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  • Câu {item.segmentIndex + 1}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatRelativeTime(item.updatedAt)}
                            </span>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRestartFromBeginning(item.youtubeId)}
                                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                                title="Học lại từ đầu"
                              >
                                <RotateCcw className="size-2.5" />
                                <span>Từ đầu</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleRemoveFromHistory(item.youtubeId, e)}
                                className="size-6 p-0 text-muted-foreground hover:text-rose-500 rounded-md"
                                title="Xóa khỏi lịch sử"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


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
        <ShadowingStudioEngine
          initialLesson={activeLesson}
          onBackToHub={() => setCurrentView("hub")}
          onLessonUpdated={(updated) => setActiveLesson(updated)}
          onNavigateToVideo={(newId) => router.push(`/shadowing/video/${newId}`)}
        />
      )}

      {/* ── MODAL: THÊM BÀI HỌC TỪ YOUTUBE (POPUP TOÀN HỆ THỐNG) ── */}
      {showAddVideoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            setShowAddVideoModal(false);
            setScannedResult(null);
          }}
        >
          <div
            className="w-full max-w-xl bg-card border border-border/80 ring-1 ring-primary/25 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header & Dual Tabs */}
            <div className="border-b border-border/60 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
                    <YouTubeIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                      Thêm bài học từ YouTube
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Dán link video đơn lẻ hoặc quét danh sách từ Kênh / Playlist
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddVideoModal(false);
                    setScannedResult(null);
                  }}
                  className="size-8 rounded-xl hover:bg-muted text-muted-foreground flex items-center justify-center"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setAddModalTab("single")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                    addModalTab === "single"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Film className="size-3.5" />
                  <span>1 Video (URL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalTab("channel")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                    addModalTab === "channel"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Layers className="size-3.5 text-primary" />
                  <span>Kênh / Playlist</span>
                </button>
              </div>
            </div>

            {addModalTab === "single" ? (
              /* TAB 1: 1 VIDEO (URL) */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                    <span>Đường dẫn video YouTube:</span>
                    <button
                      type="button"
                      onClick={() => handlePasteClipboard("modalSingle")}
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

                {/* Channel / Playlist Assignment Option */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                    <span>Lưu vào Kênh / Danh mục:</span>
                    <span className="text-[10px] text-muted-foreground/80 font-normal">
                      Tự động hoặc chọn nhóm
                    </span>
                  </label>
                  <Select
                    value={modalTargetChannel}
                    onValueChange={(val: string | null) => val && setModalTargetChannel(val)}
                  >
                    <SelectTrigger className="w-full h-9.5 text-xs rounded-xl bg-muted/40 border-border/70">
                      <SelectValue placeholder="Chọn kênh lưu bài học..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="text-xs font-medium">
                        ✨ Tự động theo kênh YouTube (Khuyên dùng)
                      </SelectItem>
                      {uniqueChannels.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Kênh có sẵn trong thư viện
                          </div>
                          {uniqueChannels.map((ch) => (
                            <SelectItem key={ch} value={ch} className="text-xs">
                              📁 {ch}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      <SelectItem value="__new__" className="text-xs text-primary font-semibold">
                        ➕ Tạo kênh / nhóm mới...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {modalTargetChannel === "__new__" && (
                    <div className="pt-1.5">
                      <Input
                        value={modalCustomChannelName}
                        onChange={(e) => setModalCustomChannelName(e.target.value)}
                        placeholder="Nhập tên kênh hoặc chuyên mục mới..."
                        className="h-9 text-xs rounded-xl border-primary/40 focus-visible:border-primary"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddVideoModal(false);
                      setModalTargetChannel("auto");
                      setModalCustomChannelName("");
                    }}
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
            ) : (
              /* TAB 2: KÊNH / PLAYLIST */
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                    <span>Đường dẫn Kênh hoặc Playlist YouTube:</span>
                    <button
                      type="button"
                      onClick={() => handlePasteClipboard("modalChannel")}
                      className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <Copy className="size-3" />
                      <span>Dán từ clipboard</span>
                    </button>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 flex items-center pointer-events-none">
                        <YouTubeIcon className="size-4" />
                      </div>
                      <Input
                        value={channelUrlInput}
                        onChange={(e) => setChannelUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleScanChannel()}
                        placeholder="@TEDEd, youtube.com/@kênh, hoặc link playlist..."
                        className="h-10 pl-9 pr-8 text-xs sm:text-sm rounded-xl border-border/80 focus-visible:border-primary"
                        autoFocus
                      />
                      {channelUrlInput && (
                        <button
                          onClick={() => setChannelUrlInput("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={handleScanChannel}
                      disabled={isScanningChannel || !channelUrlInput.trim()}
                      className="h-10 px-3.5 rounded-xl text-xs font-bold gap-1.5 shrink-0"
                    >
                      {isScanningChannel ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Đang quét...</span>
                        </>
                      ) : (
                        <>
                          <Search className="size-3.5" />
                          <span>Quét video</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Scanned Result Video Preview List */}
                {scannedResult && (
                  <div className="space-y-2.5 pt-1 animate-in fade-in-0 duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                      <div>
                        <span className="text-xs font-bold text-foreground block truncate max-w-[260px] sm:max-w-[340px]">
                          {scannedResult.sourceTitle || scannedResult.sourceChannel}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Tìm thấy {scannedResult.videos.length} video • Đã chọn {selectedScrapedIds.size}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedScrapedIds(new Set(scannedResult.videos.map((v) => v.youtubeId)))}
                          className="text-primary hover:underline font-semibold px-1 py-0.5"
                        >
                          Chọn hết
                        </button>
                        <span className="text-muted-foreground/50">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedScrapedIds(new Set())}
                          className="text-muted-foreground hover:underline px-1 py-0.5"
                        >
                          Bỏ chọn
                        </button>
                        <span className="text-muted-foreground/50">•</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedScrapedIds(
                              new Set(
                                scannedResult.videos
                                  .filter((v) => !videoLibrary.some((lib) => lib.youtubeId === v.youtubeId))
                                  .map((v) => v.youtubeId)
                              )
                            )
                          }
                          className="text-primary hover:underline font-semibold px-1 py-0.5"
                        >
                          Chỉ video mới
                        </button>
                      </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-2 pr-1 rounded-xl">
                      {scannedResult.videos.map((video) => {
                        const isAlreadyInLib = videoLibrary.some((lib) => lib.youtubeId === video.youtubeId);
                        const isChecked = selectedScrapedIds.has(video.youtubeId);

                        return (
                          <div
                            key={video.youtubeId}
                            onClick={() => {
                              setSelectedScrapedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(video.youtubeId)) {
                                  next.delete(video.youtubeId);
                                } else {
                                  next.add(video.youtubeId);
                                }
                                return next;
                              });
                            }}
                            className={cn(
                              "flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none",
                              isChecked
                                ? "bg-primary/10 border-primary/40 shadow-2xs"
                                : "bg-card border-border/60 hover:bg-muted/30"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Handled by container onClick
                              className="size-4 rounded accent-primary cursor-pointer shrink-0"
                            />

                            <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-black/60 shrink-0 border border-border/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-foreground line-clamp-1 leading-snug" title={video.title}>
                                {video.title}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                  {video.channel}
                                </span>
                                {(video.publishedText || video.publishedAt) && (
                                  <>
                                    <span className="text-muted-foreground/40 text-[10px]">•</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {video.publishedText || formatRelativeTime(video.publishedAt)}
                                    </span>
                                  </>
                                )}
                                {video.duration && (
                                  <>
                                    <span className="text-muted-foreground/40 text-[10px]">•</span>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {video.duration}
                                    </span>
                                  </>
                                )}
                                {isAlreadyInLib && (
                                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-muted text-muted-foreground">
                                    Đã có
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Import Button */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddVideoModal(false);
                          setScannedResult(null);
                        }}
                        className="rounded-xl text-xs h-9"
                      >
                        Hủy bỏ
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBatchImportVideos}
                        disabled={isImportingScraped || selectedScrapedIds.size === 0}
                        className="rounded-xl text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-md shadow-primary/25"
                      >
                        {isImportingScraped ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Đang lưu vào thư viện...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            <span>Thêm {selectedScrapedIds.size} video vào Thư viện</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: QUÉT VIDEO MỚI HÀNG NGÀY & KÊNH THEO DÕI ── */}
      {showChannelSyncModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowChannelSyncModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-card border border-border/80 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <Radio className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    Quét Video Mới Hàng Ngày
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Tự động kiểm tra bài học mới từ các kênh YouTube bạn theo dõi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChannelSyncModal(false)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Option 1: Auto Daily Scan Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/30">
                <div className="space-y-0.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">Tự động quét mỗi ngày khi mở web</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hệ thống sẽ âm thầm kiểm tra bài mới khi bước sang ngày mới và chỉ thông báo khi có video mới ra lò.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !channelSyncConfig.autoDailyScan;
                    const updated = toggleAutoDailyScan(next);
                    setChannelSyncConfig(updated);
                    toast.success(next ? "Đã bật tự động quét hàng ngày!" : "Đã tắt tự động quét hàng ngày");
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    channelSyncConfig.autoDailyScan ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      channelSyncConfig.autoDailyScan ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Option 2: Tracked Channels List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Library className="size-3.5 text-muted-foreground" />
                    <span>Các kênh đang theo dõi</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {channelSyncConfig.trackedChannels.length}
                    </Badge>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    (Tự đồng bộ từ Thư viện)
                  </span>
                </div>

                {channelSyncConfig.trackedChannels.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                    Chưa có kênh nào. Khi bạn nạp bài học từ kênh YouTube vào Thư viện, kênh đó sẽ tự động được theo dõi tại đây.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                    {channelSyncConfig.trackedChannels.map((ch) => (
                      <div
                        key={ch.channelUrl}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 bg-card text-xs text-foreground group"
                      >
                        <YouTubeIcon className="size-3 text-red-500 shrink-0" />
                        <span className="font-medium truncate max-w-[160px]" title={ch.channelName}>
                          {ch.channelName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveTrackedChannel(ch.channelUrl, e)}
                          className="text-muted-foreground hover:text-rose-500 ml-1 transition-colors"
                          title="Hủy theo dõi kênh này"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Trigger Button */}
              <div className="pt-1">
                <Button
                  onClick={handleManualChannelScan}
                  disabled={isSyncingChannels || channelSyncConfig.trackedChannels.length === 0}
                  className="w-full h-9 rounded-xl text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                >
                  {isSyncingChannels ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang quét các kênh YouTube...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3.5" />
                      <span>Quét ngay bây giờ ({channelSyncConfig.trackedChannels.length} kênh)</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Status Message if No Videos */}
              {syncSummaryMessage && newDiscoveredVideos.length === 0 && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-center text-xs text-muted-foreground">
                  {syncSummaryMessage}
                </div>
              )}

              {/* Discovered New Videos */}
              {newDiscoveredVideos.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="size-3.5" />
                      <span>Phát hiện {newDiscoveredVideos.length} video mới!</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDiscoveredIds.size === newDiscoveredVideos.length) {
                          setSelectedDiscoveredIds(new Set());
                        } else {
                          setSelectedDiscoveredIds(new Set(newDiscoveredVideos.map((v) => v.youtubeId)));
                        }
                      }}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      {selectedDiscoveredIds.size === newDiscoveredVideos.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {newDiscoveredVideos.map((video) => {
                      const isChecked = selectedDiscoveredIds.has(video.youtubeId);
                      return (
                        <div
                          key={video.youtubeId}
                          onClick={() => {
                            setSelectedDiscoveredIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(video.youtubeId)) next.delete(video.youtubeId);
                              else next.add(video.youtubeId);
                              return next;
                            });
                          }}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none",
                            isChecked
                              ? "bg-primary/10 border-primary/40 shadow-2xs"
                              : "bg-card border-border/60 hover:bg-muted/30"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="size-4 rounded accent-primary cursor-pointer shrink-0"
                          />
                          <div className="relative w-16 aspect-video rounded-md overflow-hidden bg-black/60 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-foreground line-clamp-1 leading-snug">
                              {video.title}
                            </h5>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                              <span>{video.channel}</span>
                              {video.publishedText && (
                                <>
                                  <span>•</span>
                                  <span>{video.publishedText}</span>
                                </>
                              )}
                              {video.duration && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{video.duration}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add selected button */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
                    <Button
                      size="sm"
                      onClick={handleBatchImportDiscoveredVideos}
                      disabled={selectedDiscoveredIds.size === 0}
                      className="rounded-xl text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-md shadow-primary/25"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Thêm {selectedDiscoveredIds.size} video vào Thư viện</span>
                    </Button>
                  </div>
                </div>
              )}
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
                    {(duplicatePrompt.lesson as any).segmentCount || duplicatePrompt.lesson.segments?.length || 0} câu thoại
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
                  setModalTargetChannel("auto");
                  setModalCustomChannelName("");
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

      {/* Modal Xác Nhận Xóa Kênh YouTube */}
      {channelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 text-card-foreground">
            <div className="flex items-start gap-3.5">
              <div className="size-11 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-foreground">
                  Xác nhận xóa kênh YouTube
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dọn sạch bài học của kênh khỏi thiết bị
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChannelToDelete(null)}
                className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-3.5 text-xs text-muted-foreground space-y-2">
              <p>
                Bạn có chắc chắn muốn xóa kênh{" "}
                <span className="font-bold text-foreground">
                  &ldquo;{channelToDelete.channelName}&rdquo;
                </span>{" "}
                không?
              </p>
              <ul className="list-disc list-inside space-y-1 text-foreground/80 pl-1">
                <li>
                  Xóa vĩnh viễn{" "}
                  <span className="font-bold text-rose-500">
                    {channelToDelete.videoCount} video bài học
                  </span>{" "}
                  trong thư viện.
                </li>
                <li>Xóa sạch toàn bộ phụ đề transcript đã lưu trong IndexedDB.</li>
                <li>Hủy theo dõi tự động hàng ngày từ kênh này.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChannelToDelete(null)}
                className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDeleteChannel}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Xóa kênh & {channelToDelete.videoCount} video</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
