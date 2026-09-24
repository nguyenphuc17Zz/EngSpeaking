// Shadowing Video Playback Progress Service
// Persists current learning time and segment position in localStorage

export interface VideoPlaybackProgress {
  youtubeId: string;
  currentTime: number; // Current playback time in seconds
  segmentIndex: number; // Active segment index (0-based)
  updatedAt: string; // ISO date string
}

const STORAGE_KEY = "engspeak_shadowing_progress_v1";

/**
 * Retrieve all video progress map from localStorage
 */
export function getAllVideoProgress(): Record<string, VideoPlaybackProgress> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Retrieve saved progress for a specific video by YouTube ID
 */
export function getVideoProgress(youtubeId: string): VideoPlaybackProgress | null {
  if (!youtubeId || typeof window === "undefined") return null;

  try {
    const map = getAllVideoProgress();
    const item = map[youtubeId];
    if (!item) return null;

    return {
      youtubeId: item.youtubeId || youtubeId,
      currentTime: typeof item.currentTime === "number" && !isNaN(item.currentTime) ? Math.max(0, item.currentTime) : 0,
      segmentIndex: typeof item.segmentIndex === "number" && !isNaN(item.segmentIndex) ? Math.max(0, Math.floor(item.segmentIndex)) : 0,
      updatedAt: item.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Save or update progress for a specific video
 */
export function saveVideoProgress(
  youtubeId: string,
  progress: { currentTime: number; segmentIndex: number }
): VideoPlaybackProgress | null {
  if (!youtubeId || typeof window === "undefined") return null;

  try {
    const map = getAllVideoProgress();
    const validTime = Math.max(0, Math.round(progress.currentTime * 100) / 100);
    const validSegmentIndex = Math.max(0, Math.floor(progress.segmentIndex));

    const item: VideoPlaybackProgress = {
      youtubeId,
      currentTime: validTime,
      segmentIndex: validSegmentIndex,
      updatedAt: new Date().toISOString(),
    };

    map[youtubeId] = item;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return item;
  } catch {
    return null;
  }
}

/**
 * Reset progress for a specific video (e.g. when user clicks 'Học lại từ đầu')
 */
export function resetVideoProgress(youtubeId: string): void {
  if (!youtubeId || typeof window === "undefined") return;

  try {
    const map = getAllVideoProgress();
    if (map[youtubeId]) {
      delete map[youtubeId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Clear all progress history from storage
 */
export function clearAllVideoProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Get sorted list of all progress items, ordered by latest updated first
 */
export function getVideoHistoryList(): VideoPlaybackProgress[] {
  if (typeof window === "undefined") return [];
  try {
    const map = getAllVideoProgress();
    const items = Object.values(map).filter(
      (item) => item && item.youtubeId && (item.currentTime > 2 || item.segmentIndex > 0)
    );
    return items.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  } catch {
    return [];
  }
}

/**
 * Get the single most recently learned video progress item
 */
export function getMostRecentVideoProgress(): VideoPlaybackProgress | null {
  const list = getVideoHistoryList();
  return list.length > 0 ? list[0] : null;
}

/**
 * Format playback time into mm:ss or hh:mm:ss format
 */
export function formatPlaybackTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const totalSec = Math.floor(seconds);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format relative time in Vietnamese (Vừa xong, 5 phút trước, Hôm nay, Hôm qua...)
 */
export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const target = new Date(isoString).getTime();
    if (isNaN(target)) return "";
    const diffSec = Math.max(0, Math.floor((Date.now() - target) / 1000));

    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return "Hôm qua";
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return new Date(target).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
