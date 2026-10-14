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
import {
  CORODOMO_VIDEO_PRESETS,
  type CorodomoVideoLesson,
  extractYouTubeVideoId,
} from "@/lib/foundation/shadowing/corodomo-presets";
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
  resetVideoProgress,
  clearAllVideoProgress,
  getVideoHistoryList,
  getMostRecentVideoProgress,
  formatPlaybackTime,
  formatRelativeTime,
} from "@/lib/foundation/shadowing/shadowing-progress.service";
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  PlusCircle,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  Trash2,
  Clock,
  Layers,
  Film,
  RefreshCw,
  Library,
  Pencil,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Calendar,
  Dices,
  ArrowUpDown,
} from "lucide-react";
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
  const [isMounted, setIsMounted] = useState(false);

  // Safe non-localStorage initial state to eliminate SSR React Hydration Mismatch
  const [activeLesson, setActiveLesson] = useState<CorodomoVideoLesson>(EMPTY_SHADOWING_LESSON);
  const activeLessonRef = useRef(activeLesson);
  activeLessonRef.current = activeLesson;

  // Auto-heal fragmented 1-2 word sentences in activeLesson so current view is 100% clean
  useEffect(() => {
    if (!activeLesson?.segments || activeLesson.segments.length <= 1) return;
    const healed = mergeFragmentedSegments(activeLesson.segments);
    const isDifferent =
      healed.length !== activeLesson.segments.length ||
      healed.some((s, i) => s.text !== activeLesson.segments[i]?.text);
    if (isDifferent) {
      setActiveLesson((prev) => ({
        ...prev,
        segments: healed,
      }));
      if (activeLesson.youtubeId) {
        saveTranscript(activeLesson.youtubeId, healed).catch(() => {});
      }
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
          if (
            activeLesson.youtubeId &&
            (healed.length !== dbSegments.length ||
              dbSegments.some((s) => /(?:^|\s)(?:>>|&gt;&gt;|--)/.test(s.text)))
          ) {
            saveTranscript(activeLesson.youtubeId, healed).catch(() => {});
          }
          setActiveLesson((prev) => ({
            ...prev,
            segments: healed,
          }));
        }
      });
    }
  }, [activeLesson?.id, activeLesson?.youtubeId]);

  // ─── UI & Input State ────────────────────────────────────────────────
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [modalUrlInput, setModalUrlInput] = useState("");
  const [modalTargetChannel, setModalTargetChannel] = useState<string>("auto");
  const [modalCustomChannelName, setModalCustomChannelName] = useState<string>("");
  const [isLoadingCustomUrl, setIsLoadingCustomUrl] = useState(false);

  // ─── Duplicate Link Detection State ─────────────────────────────────
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    isOpen: boolean;
    lesson: CorodomoVideoLesson;
    url: string;
  } | null>(null);

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

        if (recentProgress) {
          const foundInLib = lib.find((v) => v.youtubeId === recentProgress.youtubeId);
          const foundInPresets = CORODOMO_VIDEO_PRESETS.find((p) => p.youtubeId === recentProgress.youtubeId);
          if (foundInLib) {
            targetLesson = foundInLib;
          } else if (foundInPresets) {
            targetLesson = foundInPresets;
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

      setActiveLesson(loadedLesson);
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
      setHistoryRefreshKey((k) => k + 1);
      router.push(`/shadowing/video/${targetId}`);
    }
  }, [router]);

  const handleSelectLesson = useCallback(
    (lesson: CorodomoVideoLesson) => {
      const targetId = lesson.youtubeId || lesson.id;
      if (targetId) {
        router.push(`/shadowing/video/${targetId}`);
      }
    },
    [router]
  );

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

  return (
    <div className="flex flex-col bg-background select-none min-h-full">
      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 1: SHADOWING HUB (MÀN CHÍNH - LỊCH SỬ & DÁN LINK YOUTUBE)
      ══════════════════════════════════════════════════════════════════════ */}
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
