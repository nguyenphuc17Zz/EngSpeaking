import { describe, it, expect, beforeEach } from "vitest";
import {
  getChannelSyncConfig,
  toggleAutoDailyScan,
  recordTrackedChannel,
  removeTrackedChannel,
  syncTrackedChannelsFromLibrary,
  shouldRunDailyScan,
  markDailyScanCompleted,
} from "@/lib/foundation/shadowing/shadowing-channel-sync.service";
import type { SavedVideoLesson } from "@/lib/foundation/shadowing/shadowing-library.service";

describe("Shadowing Channel Sync Service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default config when storage is empty", () => {
    const config = getChannelSyncConfig();
    expect(config.autoDailyScan).toBe(true);
    expect(config.lastDailyScanDate).toBe("");
    expect(config.trackedChannels).toEqual([]);
  });

  it("toggles autoDailyScan setting correctly", () => {
    const turnedOff = toggleAutoDailyScan(false);
    expect(turnedOff.autoDailyScan).toBe(false);
    expect(getChannelSyncConfig().autoDailyScan).toBe(false);

    const turnedOn = toggleAutoDailyScan(true);
    expect(turnedOn.autoDailyScan).toBe(true);
    expect(getChannelSyncConfig().autoDailyScan).toBe(true);
  });

  it("records and updates tracked channels without duplicates", () => {
    recordTrackedChannel("BBC Learning English", "https://www.youtube.com/@BBCLearningEnglish");
    let config = getChannelSyncConfig();
    expect(config.trackedChannels.length).toBe(1);
    expect(config.trackedChannels[0].channelName).toBe("BBC Learning English");

    // Recording same channel updates existing item
    recordTrackedChannel("BBC Learning English", "https://www.youtube.com/@BBCLearningEnglish", "thumb.jpg");
    config = getChannelSyncConfig();
    expect(config.trackedChannels.length).toBe(1);
    expect(config.trackedChannels[0].thumbnail).toBe("thumb.jpg");

    // Add another channel
    recordTrackedChannel("Oxford Online English", "https://www.youtube.com/@OxfordOnlineEnglish");
    config = getChannelSyncConfig();
    expect(config.trackedChannels.length).toBe(2);
  });

  it("removes a channel from tracked channels", () => {
    recordTrackedChannel("Channel A", "https://www.youtube.com/@A");
    recordTrackedChannel("Channel B", "https://www.youtube.com/@B");
    expect(getChannelSyncConfig().trackedChannels.length).toBe(2);

    removeTrackedChannel("https://www.youtube.com/@A");
    const updated = getChannelSyncConfig();
    expect(updated.trackedChannels.length).toBe(1);
    expect(updated.trackedChannels[0].channelName).toBe("Channel B");
  });

  it("auto-syncs tracked channels from existing library", () => {
    const mockLibrary: SavedVideoLesson[] = [
      {
        id: "v1",
        youtubeId: "y1111111111",
        title: "Lesson 1",
        channel: "English Speaking Success",
        thumbnail: "https://img.youtube.com/vi/y1111111111/hqdefault.jpg",
        duration: "05:00",
        cefrLevel: "Custom",
        playlistName: "PL1",
        playlistId: "pl1",
        segments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "v2",
        youtubeId: "y2222222222",
        title: "Lesson 2",
        channel: "English Speaking Success", // Duplicate channel
        thumbnail: "https://img.youtube.com/vi/y2222222222/hqdefault.jpg",
        duration: "06:00",
        cefrLevel: "Custom",
        playlistName: "PL1",
        playlistId: "pl1",
        segments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    syncTrackedChannelsFromLibrary(mockLibrary);
    const config = getChannelSyncConfig();
    expect(config.trackedChannels.length).toBe(1);
    expect(config.trackedChannels[0].channelName).toBe("English Speaking Success");
  });

  it("handles daily scan status and completion", () => {
    // No channels yet -> should not run
    expect(shouldRunDailyScan()).toBe(false);

    recordTrackedChannel("BBC", "@BBC");
    // Has channels and lastDailyScanDate is empty -> should run
    expect(shouldRunDailyScan()).toBe(true);

    markDailyScanCompleted();
    // Marked completed for today -> should not run again today
    expect(shouldRunDailyScan()).toBe(false);

    // If turned off -> should not run
    toggleAutoDailyScan(false);
    expect(shouldRunDailyScan()).toBe(false);
  });
});
