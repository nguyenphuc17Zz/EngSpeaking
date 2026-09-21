// Shadowing Watch & Practice History Service
// Persists video lessons, practice progress, and pronunciation scores

import type { CorodomoVideoLesson } from "./corodomo-presets";

import { isMockVideoItem } from "./shadowing-library.service";

export interface ShadowingHistoryItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  totalSegments: number;
  completedSegments: number;
  averageScore?: number;
  lastPracticedAt: string; // ISO string
  lastSegmentIndex: number;
  cefrLevel?: string;
  lessonData?: CorodomoVideoLesson;
}

const STORAGE_KEY = "engspeak_shadowing_history_v1";

/**
 * Retrieve user's shadowing history from localStorage with auto-purge of mock items
 */
export function getShadowingHistory(): ShadowingHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let hasPurged = false;
    const cleaned = parsed.filter((item) => {
      if (isMockVideoItem(item)) {
        hasPurged = true;
        return false;
      }
      return true;
    });

    if (hasPurged || cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Save or update a lesson in shadowing history
 */
export function saveToShadowingHistory(
  lesson: CorodomoVideoLesson,
  completedSegmentsCount: number = 0,
  averageScore?: number,
  lastSegmentIndex: number = 0
): ShadowingHistoryItem[] {
  if (typeof window === "undefined" || !lesson?.youtubeId) return [];

  try {
    const history = getShadowingHistory();
    const existingIndex = history.findIndex((h) => h.youtubeId === lesson.youtubeId);

    const updatedItem: ShadowingHistoryItem = {
      id: lesson.id || `video_${lesson.youtubeId}`,
      youtubeId: lesson.youtubeId,
      title: lesson.title,
      channel: lesson.channel,
      thumbnail: lesson.thumbnail || `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`,
      duration: lesson.duration || "05:00",
      totalSegments: lesson.segments?.length || 0,
      completedSegments: Math.max(
        completedSegmentsCount,
        existingIndex !== -1 ? history[existingIndex].completedSegments : 0
      ),
      averageScore:
        averageScore !== undefined
          ? averageScore
          : existingIndex !== -1
          ? history[existingIndex].averageScore
          : undefined,
      lastPracticedAt: new Date().toISOString(),
      lastSegmentIndex: Math.max(0, lastSegmentIndex),
      cefrLevel: lesson.cefrLevel,
      lessonData: lesson,
    };

    let newHistory: ShadowingHistoryItem[];
    if (existingIndex !== -1) {
      newHistory = [
        updatedItem,
        ...history.slice(0, existingIndex),
        ...history.slice(existingIndex + 1),
      ];
    } else {
      newHistory = [updatedItem, ...history];
    }

    // Keep up to 30 recent items
    const trimmed = newHistory.slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
}

/**
 * Remove an item from shadowing history
 */
export function removeFromShadowingHistory(youtubeId: string): ShadowingHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const history = getShadowingHistory();
    const updated = history.filter((h) => h.youtubeId !== youtubeId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Clear all shadowing history
 */
export function clearShadowingHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
