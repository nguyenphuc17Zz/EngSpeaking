// Channel Sync & Daily Auto-Scan Service for Shadowing
// Manages tracked YouTube channels and daily auto-scan preferences

import type { SavedVideoLesson } from "./shadowing-library.service";

export interface TrackedChannel {
  channelName: string;
  channelUrl: string; // e.g. "@BBCLearningEnglish" or "https://www.youtube.com/@..."
  thumbnail?: string;
  lastScannedAt?: string;
}

export interface ChannelSyncConfig {
  autoDailyScan: boolean;
  lastDailyScanDate: string; // YYYY-MM-DD
  trackedChannels: TrackedChannel[];
}

const STORAGE_KEY = "engspeak_channel_sync_v1";

const DEFAULT_CONFIG: ChannelSyncConfig = {
  autoDailyScan: true,
  lastDailyScanDate: "",
  trackedChannels: [],
};

/**
 * Get current channel sync configuration
 */
export function getChannelSyncConfig(): ChannelSyncConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      autoDailyScan: typeof parsed.autoDailyScan === "boolean" ? parsed.autoDailyScan : true,
      lastDailyScanDate: typeof parsed.lastDailyScanDate === "string" ? parsed.lastDailyScanDate : "",
      trackedChannels: Array.isArray(parsed.trackedChannels) ? parsed.trackedChannels : [],
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Save channel sync configuration
 */
export function saveChannelSyncConfig(config: ChannelSyncConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

/**
 * Toggle auto daily scan setting
 */
export function toggleAutoDailyScan(enabled: boolean): ChannelSyncConfig {
  const current = getChannelSyncConfig();
  const updated = {
    ...current,
    autoDailyScan: enabled,
  };
  saveChannelSyncConfig(updated);
  return updated;
}

/**
 * Record or update a tracked channel (called when user scans/imports a channel or playlist)
 */
export function recordTrackedChannel(name: string, url: string, thumbnail?: string): ChannelSyncConfig {
  const current = getChannelSyncConfig();
  const cleanName = name.trim() || "YouTube Channel";
  const cleanUrl = url.trim();
  if (!cleanUrl) return current;

  // Check if channel is already tracked
  const existingIdx = current.trackedChannels.findIndex(
    (c) =>
      c.channelUrl.toLowerCase() === cleanUrl.toLowerCase() ||
      c.channelName.toLowerCase() === cleanName.toLowerCase()
  );

  const updatedList = [...current.trackedChannels];
  if (existingIdx >= 0) {
    updatedList[existingIdx] = {
      ...updatedList[existingIdx],
      channelName: cleanName,
      channelUrl: cleanUrl,
      thumbnail: thumbnail || updatedList[existingIdx].thumbnail,
      lastScannedAt: new Date().toISOString(),
    };
  } else {
    updatedList.push({
      channelName: cleanName,
      channelUrl: cleanUrl,
      thumbnail,
      lastScannedAt: new Date().toISOString(),
    });
  }

  const updated: ChannelSyncConfig = {
    ...current,
    trackedChannels: updatedList,
  };
  saveChannelSyncConfig(updated);
  return updated;
}

/**
 * Remove a channel from tracked channels
 */
export function removeTrackedChannel(channelUrlOrName: string): ChannelSyncConfig {
  const current = getChannelSyncConfig();
  const target = channelUrlOrName.trim().toLowerCase();
  const updatedList = current.trackedChannels.filter(
    (c) => c.channelUrl.toLowerCase() !== target && c.channelName.toLowerCase() !== target
  );

  const updated: ChannelSyncConfig = {
    ...current,
    trackedChannels: updatedList,
  };
  saveChannelSyncConfig(updated);
  return updated;
}

/**
 * Auto-sync tracked channels from the active video library.
 * If a video belongs to a channel not yet in trackedChannels, creates a tracking entry.
 */
export function syncTrackedChannelsFromLibrary(library: SavedVideoLesson[]): ChannelSyncConfig {
  const current = getChannelSyncConfig();
  const existingUrls = new Set(current.trackedChannels.map((c) => c.channelUrl.toLowerCase()));
  const existingNames = new Set(current.trackedChannels.map((c) => c.channelName.toLowerCase()));

  const added: TrackedChannel[] = [];

  for (const lesson of library) {
    const ch = (lesson.channel || "").trim();
    if (!ch || ch === "YouTube" || ch === "Video Tự Chọn" || ch === "Custom") continue;

    if (!existingNames.has(ch.toLowerCase())) {
      existingNames.add(ch.toLowerCase());
      // Build a search/handle fallback url for this channel name
      const fallbackUrl = ch.startsWith("@") ? `https://www.youtube.com/${ch}` : `https://www.youtube.com/@${ch.replace(/\s+/g, "")}`;
      if (!existingUrls.has(fallbackUrl.toLowerCase())) {
        existingUrls.add(fallbackUrl.toLowerCase());
        added.push({
          channelName: ch,
          channelUrl: fallbackUrl,
          thumbnail: lesson.thumbnail,
          lastScannedAt: new Date().toISOString(),
        });
      }
    }
  }

  if (added.length === 0) return current;

  const updated: ChannelSyncConfig = {
    ...current,
    trackedChannels: [...current.trackedChannels, ...added],
  };
  saveChannelSyncConfig(updated);
  return updated;
}

/**
 * Checks whether the daily scan should trigger today
 */
export function shouldRunDailyScan(): boolean {
  const config = getChannelSyncConfig();
  if (!config.autoDailyScan) return false;
  if (config.trackedChannels.length === 0) return false;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return config.lastDailyScanDate !== today;
}

/**
 * Mark daily scan as executed for today
 */
export function markDailyScanCompleted(): ChannelSyncConfig {
  const current = getChannelSyncConfig();
  const today = new Date().toISOString().slice(0, 10);
  const updated: ChannelSyncConfig = {
    ...current,
    lastDailyScanDate: today,
  };
  saveChannelSyncConfig(updated);
  return updated;
}
