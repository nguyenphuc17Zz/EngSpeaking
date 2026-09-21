import { describe, it, expect, beforeEach } from "vitest";
import {
  getVideoProgress,
  saveVideoProgress,
  resetVideoProgress,
  getAllVideoProgress,
  clearAllVideoProgress,
  getVideoHistoryList,
  formatPlaybackTime,
} from "@/lib/foundation/shadowing/shadowing-progress.service";

describe("Shadowing Playback Progress Service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no progress exists for a video", () => {
    expect(getVideoProgress("nonexistent_id")).toBeNull();
  });

  it("saves and retrieves progress for a video", () => {
    const saved = saveVideoProgress("vid_123456789", {
      currentTime: 45.678,
      segmentIndex: 4,
    });

    expect(saved).not.toBeNull();
    expect(saved?.youtubeId).toBe("vid_123456789");
    expect(saved?.currentTime).toBe(45.68);
    expect(saved?.segmentIndex).toBe(4);
    expect(saved?.updatedAt).toBeDefined();

    const retrieved = getVideoProgress("vid_123456789");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.currentTime).toBe(45.68);
    expect(retrieved?.segmentIndex).toBe(4);
  });

  it("updates existing progress properly", () => {
    saveVideoProgress("vid_test", { currentTime: 10, segmentIndex: 1 });
    saveVideoProgress("vid_test", { currentTime: 85.2, segmentIndex: 7 });

    const progress = getVideoProgress("vid_test");
    expect(progress?.currentTime).toBe(85.2);
    expect(progress?.segmentIndex).toBe(7);
  });

  it("handles multiple videos independently", () => {
    saveVideoProgress("vid_a", { currentTime: 20, segmentIndex: 2 });
    saveVideoProgress("vid_b", { currentTime: 50, segmentIndex: 5 });

    const all = getAllVideoProgress();
    expect(Object.keys(all)).toHaveLength(2);
    expect(getVideoProgress("vid_a")?.currentTime).toBe(20);
    expect(getVideoProgress("vid_b")?.currentTime).toBe(50);
  });

  it("resets progress when resetVideoProgress is called", () => {
    saveVideoProgress("vid_reset", { currentTime: 120, segmentIndex: 12 });
    expect(getVideoProgress("vid_reset")).not.toBeNull();

    resetVideoProgress("vid_reset");
    expect(getVideoProgress("vid_reset")).toBeNull();
  });

  it("formats playback time into mm:ss and hh:mm:ss", () => {
    expect(formatPlaybackTime(0)).toBe("00:00");
    expect(formatPlaybackTime(45)).toBe("00:45");
    expect(formatPlaybackTime(65)).toBe("01:05");
    expect(formatPlaybackTime(600)).toBe("10:00");
    expect(formatPlaybackTime(3665)).toBe("1:01:05");
    expect(formatPlaybackTime(-5)).toBe("00:00");
    expect(formatPlaybackTime(NaN)).toBe("00:00");
  });

  it("retrieves sorted history list and clears all progress", () => {
    saveVideoProgress("vid_1", { currentTime: 10, segmentIndex: 1 });
    saveVideoProgress("vid_2", { currentTime: 25, segmentIndex: 3 });

    const history = getVideoHistoryList();
    expect(history.length).toBe(2);
    expect(history.some((h) => h.youtubeId === "vid_1")).toBe(true);
    expect(history.some((h) => h.youtubeId === "vid_2")).toBe(true);

    clearAllVideoProgress();
    expect(getVideoHistoryList()).toEqual([]);
  });
});

