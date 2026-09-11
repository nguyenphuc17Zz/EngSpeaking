// Video Library CRUD Service for Shadowing
// Manages the user's personal collection of video lessons in localStorage

import {
  CORODOMO_VIDEO_PRESETS,
  type CorodomoVideoLesson,
} from "./corodomo-presets";

export interface SavedVideoLesson extends CorodomoVideoLesson {
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
}

const LIBRARY_STORAGE_KEY = "engspeak_video_library_v1";

/**
 * Get initial default video library seeded from presets
 */
function getInitialDefaults(): SavedVideoLesson[] {
  const now = new Date().toISOString();
  return CORODOMO_VIDEO_PRESETS.map((preset) => ({
    ...preset,
    createdAt: now,
    updatedAt: now,
    isCustom: false,
  }));
}

/**
 * Retrieve all videos from personal library
 */
export function getVideoLibrary(): SavedVideoLesson[] {
  if (typeof window === "undefined") return getInitialDefaults();

  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) {
      const defaults = getInitialDefaults();
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialDefaults();
  } catch {
    return getInitialDefaults();
  }
}

/**
 * Add a new video lesson to library (Create)
 */
export function addVideoToLibrary(lesson: CorodomoVideoLesson): SavedVideoLesson[] {
  if (typeof window === "undefined" || !lesson?.youtubeId) return [];

  try {
    const library = getVideoLibrary();
    const existingIndex = library.findIndex((v) => v.youtubeId === lesson.youtubeId);

    const now = new Date().toISOString();
    const newLesson: SavedVideoLesson = {
      ...lesson,
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
 * Update video metadata: Title, Channel, CEFR Level (Update)
 */
export function updateVideoInLibrary(
  idOrYoutubeId: string,
  updates: Partial<Pick<SavedVideoLesson, "title" | "channel" | "cefrLevel">>
): SavedVideoLesson[] {
  if (typeof window === "undefined") return [];

  try {
    const library = getVideoLibrary();
    const index = library.findIndex(
      (v) => v.id === idOrYoutubeId || v.youtubeId === idOrYoutubeId
    );

    if (index === -1) return library;

    const current = library[index];
    const updatedLesson: SavedVideoLesson = {
      ...current,
      ...updates,
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
 * Delete a video lesson from library (Delete)
 */
export function deleteVideoFromLibrary(idOrYoutubeId: string): SavedVideoLesson[] {
  if (typeof window === "undefined") return [];

  try {
    const library = getVideoLibrary();
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
