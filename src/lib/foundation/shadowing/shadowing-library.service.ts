// Video Library CRUD Service for Shadowing
// Manages the user's personal collection of video lessons in localStorage

import type { CorodomoVideoLesson } from "./corodomo-presets";
import {
  saveTranscript,
  deleteTranscript,
} from "./shadowing-transcript-db.service";
import { removeTrackedChannel } from "./shadowing-channel-sync.service";

export interface SavedVideoLesson extends CorodomoVideoLesson {
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
  needsResync?: boolean;
  schemaVersion?: number;
  segmentCount?: number;
  hasTranscript?: boolean;
}

const LIBRARY_STORAGE_KEY = "engspeak_video_library_v3";
const LEGACY_STORAGE_KEYS = [
  "engspeak_video_library_v2",
  "engspeak_video_library_v1",
];

const PRESET_MOCK_YOUTUBE_IDS = new Set([
  "k188_aGDklQ",
  "gFkNhGDd8Ws",
  "Wv0c5BwU2o4",
  "1mHjMNZZvFo",
  "iCvmsMzlF7o",
]);

/**
 * Checks whether a video item is a legacy mock preset or unwanted mock template
 */
export function isMockVideoItem(item: { youtubeId?: string; id?: string; title?: string }): boolean {
  if (!item) return false;
  if (item.youtubeId && PRESET_MOCK_YOUTUBE_IDS.has(item.youtubeId)) return true;
  if (typeof item.id === "string" && item.id.startsWith("coro_")) return true;
  return false;
}

/**
 * Get initial default video library (empty by default - no mock/seed data)
 */
function getInitialDefaults(): SavedVideoLesson[] {
  return [];
}

/**
 * Retrieve all videos from personal library with auto-purging of mock presets
 */
export function getVideoLibrary(): SavedVideoLesson[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            const legacyParsed = JSON.parse(legacyRaw);
            if (Array.isArray(legacyParsed)) {
              // Filter out old seed/mock presets and keep genuine user-added videos
              const userOnly: SavedVideoLesson[] = legacyParsed
                .filter(
                  (item: any) => item.isCustom && !isMockVideoItem(item)
                )
                .map((item: any) => ({
                  ...item,
                  needsResync: true, // Flag for automatic high-precision srv3 re-sync
                  schemaVersion: 3,
                }));
              localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(userOnly));
              return userOnly;
            }
          } catch {}
        }
      }
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Auto-purge any lingering mock presets or "30 minute everyday" items from v3 storage
    let hasPurged = false;
    let hasCleanedChannel = false;
    const cleaned = parsed
      .filter((item: any) => {
        if (isMockVideoItem(item)) {
          hasPurged = true;
          if (item.youtubeId) {
            deleteTranscript(item.youtubeId).catch(() => {});
          }
          return false;
        }
        return true;
      })
      .map((item: any) => {
        if (typeof item.channel === "string") {
          const trimmed = item.channel.trim();
          if (trimmed !== item.channel) {
            hasCleanedChannel = true;
            return { ...item, channel: trimmed };
          }
        }
        return item;
      });

    if (hasPurged || hasCleanedChannel || cleaned.length !== parsed.length) {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Add a new video lesson to library (Create)
 */
export function addVideoToLibrary(lesson: CorodomoVideoLesson): SavedVideoLesson[] {
  if (typeof window === "undefined" || !lesson?.youtubeId) return [];

  try {
    if (lesson.segments && lesson.segments.length > 0) {
      saveTranscript(lesson.youtubeId, lesson.segments).catch(() => {});
    }

    const library = getVideoLibrary();
    const existingIndex = library.findIndex((v) => v.youtubeId === lesson.youtubeId);

    const now = new Date().toISOString();
    const segCount = lesson.segments ? lesson.segments.length : 0;
    const newLesson: SavedVideoLesson = {
      ...lesson,
      channel: (lesson.channel || "YouTube").trim(),
      segments: [], // Kept in IndexedDB to prevent localStorage quota exhaustion
      segmentCount: segCount,
      hasTranscript: segCount > 0,
      id: lesson.id || `video_${lesson.youtubeId}_${Date.now()}`,
      createdAt: existingIndex !== -1 ? library[existingIndex].createdAt : now,
      updatedAt: now,
      isCustom: true,
    };

    let updated: SavedVideoLesson[];
    if (existingIndex !== -1) {
      updated = [
        newLesson,
        ...library.slice(0, existingIndex),
        ...library.slice(existingIndex + 1),
      ];
    } else {
      updated = [newLesson, ...library];
    }

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Add multiple video lessons to library in one batch write (Batch Create)
 */
export function addVideosToLibrary(lessons: CorodomoVideoLesson[]): SavedVideoLesson[] {
  if (typeof window === "undefined" || !Array.isArray(lessons) || lessons.length === 0) {
    return getVideoLibrary();
  }

  try {
    let library = getVideoLibrary();
    const now = new Date().toISOString();

    for (const lesson of lessons) {
      if (!lesson?.youtubeId) continue;
      if (lesson.segments && lesson.segments.length > 0) {
        saveTranscript(lesson.youtubeId, lesson.segments).catch(() => {});
      }

      const existingIndex = library.findIndex((v) => v.youtubeId === lesson.youtubeId);
      const segCount = lesson.segments ? lesson.segments.length : 0;

      const newLesson: SavedVideoLesson = {
        ...lesson,
        channel: (lesson.channel || "YouTube").trim(),
        segments: [], // Kept in IndexedDB to prevent localStorage quota exhaustion
        segmentCount: segCount,
        hasTranscript: segCount > 0,
        id: lesson.id || `video_${lesson.youtubeId}_${Date.now()}`,
        createdAt: existingIndex !== -1 ? library[existingIndex].createdAt : now,
        updatedAt: now,
        isCustom: true,
      };

      if (existingIndex !== -1) {
        library = [
          newLesson,
          ...library.slice(0, existingIndex),
          ...library.slice(existingIndex + 1),
        ];
      } else {
        library = [newLesson, ...library];
      }
    }

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
    return library;
  } catch {
    return getVideoLibrary();
  }
}

/**
 * Update video metadata: Title, Channel, CEFR Level (Update)
 */
export function updateVideoInLibrary(
  idOrYoutubeId: string,
  updates: Partial<SavedVideoLesson>
): SavedVideoLesson[] {
  if (typeof window === "undefined") return [];

  try {
    const library = getVideoLibrary();
    const index = library.findIndex(
      (v) => v.id === idOrYoutubeId || v.youtubeId === idOrYoutubeId
    );

    if (index === -1) return library;

    const current = library[index];
    if (updates.segments && updates.segments.length > 0) {
      saveTranscript(current.youtubeId, updates.segments).catch(() => {});
    }

    const segCount = updates.segments
      ? updates.segments.length
      : (updates.segmentCount || current.segmentCount || 0);

    const updatedLesson: SavedVideoLesson = {
      ...current,
      ...updates,
      segments: [], // Kept in IndexedDB
      segmentCount: segCount,
      hasTranscript: segCount > 0,
      updatedAt: new Date().toISOString(),
    };

    const updated = [
      ...library.slice(0, index),
      updatedLesson,
      ...library.slice(index + 1),
    ];

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Delete a video lesson from library and IndexedDB (Delete)
 */
export function deleteVideoFromLibrary(idOrYoutubeId: string): SavedVideoLesson[] {
  if (typeof window === "undefined") return [];

  try {
    const library = getVideoLibrary();
    const item = library.find((v) => v.id === idOrYoutubeId || v.youtubeId === idOrYoutubeId);
    if (item?.youtubeId) {
      deleteTranscript(item.youtubeId).catch(() => {});
    }

    const updated = library.filter(
      (v) => v.id !== idOrYoutubeId && v.youtubeId !== idOrYoutubeId
    );

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Delete all videos belonging to a specific YouTube channel and clean up IndexedDB transcripts (Delete Channel)
 * Also un-tracks the channel from automatic daily sync.
 */
export function deleteChannelFromLibrary(channelName: string): {
  updatedLibrary: SavedVideoLesson[];
  deletedCount: number;
} {
  if (typeof window === "undefined" || !channelName?.trim()) {
    return { updatedLibrary: [], deletedCount: 0 };
  }

  try {
    const library = getVideoLibrary();
    const cleanTarget = channelName.trim().toLowerCase();
    const toDelete = library.filter(
      (v) => (v.channel || "").trim().toLowerCase() === cleanTarget
    );

    // Delete IndexedDB transcripts for all videos in this channel
    for (const item of toDelete) {
      if (item.youtubeId) {
        deleteTranscript(item.youtubeId).catch(() => {});
      }
    }

    const updated = library.filter(
      (v) => (v.channel || "").trim().toLowerCase() !== cleanTarget
    );

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));

    // Also remove from tracked channels if present
    try {
      removeTrackedChannel(channelName);
    } catch {}

    return {
      updatedLibrary: updated,
      deletedCount: toDelete.length,
    };
  } catch {
    return { updatedLibrary: getVideoLibrary(), deletedCount: 0 };
  }
}

/**
 * Automatically migrate full transcripts from localStorage to IndexedDB
 * Strips bulky segments array from localStorage to free up 95%+ quota
 */
export async function migrateLibraryToIndexedDb(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    let hasBulkSegments = false;

    for (const item of parsed) {
      if (item.segments && Array.isArray(item.segments) && item.segments.length > 0) {
        hasBulkSegments = true;
        if (item.youtubeId) {
          await saveTranscript(item.youtubeId, item.segments);
        }
      }
    }

    if (hasBulkSegments) {
      const slimmed = parsed.map((item) => {
        const segCount = item.segmentCount || (item.segments ? item.segments.length : 0);
        return {
          ...item,
          segments: [],
          segmentCount: segCount,
          hasTranscript: segCount > 0,
        };
      });

      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(slimmed));
    }
  } catch (err) {
    console.warn("Migration to IndexedDB warning:", err);
  }
}


/**
 * Reset library back to initial default presets
 */
export function resetVideoLibraryToDefaults(): SavedVideoLesson[] {
  if (typeof window === "undefined") return getInitialDefaults();

  try {
    const defaults = getInitialDefaults();
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  } catch {
    return getInitialDefaults();
  }
}
