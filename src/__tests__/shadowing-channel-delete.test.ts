import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  deleteChannelFromLibrary,
  addVideosToLibrary,
  getVideoLibrary,
} from "@/lib/foundation/shadowing/shadowing-library.service";
import {
  getChannelSyncConfig,
  recordTrackedChannel,
} from "@/lib/foundation/shadowing/shadowing-channel-sync.service";
import * as transcriptDb from "@/lib/foundation/shadowing/shadowing-transcript-db.service";

describe("deleteChannelFromLibrary", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should delete all videos of the specified channel and keep other channels intact", () => {
    const lessons: any[] = [
      {
        id: "vid_bbc_1",
        youtubeId: "bbc_1",
        title: "BBC Lesson 1",
        channel: "BBC Learning English",
        cefrLevel: "B1",
        playlistName: "6 Minute English",
        playlistId: "pl_1",
        thumbnail: "https://example.com/1.jpg",
        duration: "06:00",
        segments: [],
      },
      {
        id: "vid_bbc_2",
        youtubeId: "bbc_2",
        title: "BBC Lesson 2",
        channel: "BBC Learning English",
        cefrLevel: "B2",
        playlistName: "6 Minute English",
        playlistId: "pl_1",
        thumbnail: "https://example.com/2.jpg",
        duration: "06:00",
        segments: [],
      },
      {
        id: "vid_ted_1",
        youtubeId: "ted_1",
        title: "TED-Ed Lesson 1",
        channel: "TED-Ed",
        cefrLevel: "C1",
        playlistName: "Science",
        playlistId: "pl_2",
        thumbnail: "https://example.com/3.jpg",
        duration: "05:00",
        segments: [],
      },
    ];

    addVideosToLibrary(lessons);
    expect(getVideoLibrary().length).toBe(3);

    // Track both channels
    recordTrackedChannel("BBC Learning English", "https://youtube.com/@bbclearning");
    recordTrackedChannel("TED-Ed", "https://youtube.com/@teded");
    expect(getChannelSyncConfig().trackedChannels.length).toBe(2);

    // Spy on deleteTranscript
    const deleteSpy = vi.spyOn(transcriptDb, "deleteTranscript");

    // Delete "BBC Learning English"
    const result = deleteChannelFromLibrary("BBC Learning English");

    expect(result.deletedCount).toBe(2);
    expect(result.updatedLibrary.length).toBe(1);
    expect(result.updatedLibrary[0].channel).toBe("TED-Ed");

    // Verify localStorage
    expect(getVideoLibrary().length).toBe(1);
    expect(getVideoLibrary()[0].id).toBe("vid_ted_1");

    // Verify transcripts deleted
    expect(deleteSpy).toHaveBeenCalledWith("bbc_1");
    expect(deleteSpy).toHaveBeenCalledWith("bbc_2");
    expect(deleteSpy).not.toHaveBeenCalledWith("ted_1");

    // Verify channel un-tracked
    const syncConfig = getChannelSyncConfig();
    expect(syncConfig.trackedChannels.length).toBe(1);
    expect(syncConfig.trackedChannels[0].channelName).toBe("TED-Ed");
  });

  it("should return 0 deletedCount when channel is not found", () => {
    const result = deleteChannelFromLibrary("Non Existent Channel");
    expect(result.deletedCount).toBe(0);
  });
});
