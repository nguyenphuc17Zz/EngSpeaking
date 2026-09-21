import { describe, it, expect, beforeEach } from "vitest";
import {
  getVideoLibrary,
  isMockVideoItem,
} from "@/lib/foundation/shadowing/shadowing-library.service";
import { getShadowingHistory } from "@/lib/foundation/shadowing/shadowing-history.service";

describe("Shadowing Auto-Purge of Mock Data ('30 minute everyday' and legacy presets)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("isMockVideoItem", () => {
    it("identifies legacy mock preset IDs and coro_ IDs as mock items", () => {
      expect(isMockVideoItem({ youtubeId: "k188_aGDklQ", title: "Office English" })).toBe(true);
      expect(isMockVideoItem({ youtubeId: "gFkNhGDd8Ws", title: "Travel English" })).toBe(true);
      expect(isMockVideoItem({ youtubeId: "Wv0c5BwU2o4", title: "Daily Morning Routines" })).toBe(true);
      expect(isMockVideoItem({ id: "coro_travel_a1", title: "Sample Video" })).toBe(true);
    });

    it("allows genuine user-added YouTube lessons through even if title has '30 minute'", () => {
      expect(isMockVideoItem({ youtubeId: "dQw4w9WgXcQ", title: "Real YouTube Lesson" })).toBe(false);
      expect(isMockVideoItem({ youtubeId: "abc123xyz78", title: "BBC English at Work Episode 2" })).toBe(false);
      expect(isMockVideoItem({ youtubeId: "CYao3jvompU", title: "English Leap Podcast 30 Minute Practice" })).toBe(false);
      expect(isMockVideoItem({ youtubeId: "real_30m_yt", title: "30 Minute English Conversation Practice" })).toBe(false);
    });
  });

  describe("getVideoLibrary auto-purge", () => {
    it("automatically cleans up legacy mock preset IDs from localStorage v3 while keeping genuine videos", () => {
      const mockStorageData = [
        {
          id: "video_genuine_1",
          youtubeId: "genuine_yt1",
          title: "Real BBC English Podcast",
          channel: "BBC Learning",
          isCustom: true,
        },
        {
          id: "video_real_30m",
          youtubeId: "real_yt_30m",
          title: "Practice English 30 minutes everyday",
          channel: "English Conversation Podcast",
          isCustom: true,
        },
        {
          id: "coro_mock_legacy",
          youtubeId: "Wv0c5BwU2o4",
          title: "Daily English Conversation Practice | Easy Morning Routines | Level A2",
          channel: "Daily Fluent English",
          isCustom: true,
        },
      ];

      localStorage.setItem("engspeak_video_library_v3", JSON.stringify(mockStorageData));

      const library = getVideoLibrary();

      // The 2 genuine videos remain, only the mock preset Wv0c5BwU2o4 is purged
      expect(library).toHaveLength(2);
      expect(library.map((v) => v.youtubeId)).toEqual(["genuine_yt1", "real_yt_30m"]);

      // Verify localStorage was updated and cleaned
      const rawStored = JSON.parse(localStorage.getItem("engspeak_video_library_v3") || "[]");
      expect(rawStored).toHaveLength(2);
      expect(rawStored.map((v: any) => v.youtubeId)).toEqual(["genuine_yt1", "real_yt_30m"]);
    });
  });

  describe("getShadowingHistory auto-purge", () => {
    it("automatically removes '30 minute everyday' from user practice history", () => {
      const mockHistory = [
        {
          id: "video_genuine_1",
          youtubeId: "genuine_yt1",
          title: "Real BBC English Podcast",
          channel: "BBC Learning",
          lastPracticedAt: new Date().toISOString(),
        },
        {
          id: "coro_mock_legacy",
          youtubeId: "Wv0c5BwU2o4",
          title: "Daily Morning Routines Mock Lesson",
          channel: "Daily Fluent English",
          lastPracticedAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem("engspeak_shadowing_history_v1", JSON.stringify(mockHistory));

      const history = getShadowingHistory();
      expect(history).toHaveLength(1);
      expect(history[0].youtubeId).toBe("genuine_yt1");

      const rawHistory = JSON.parse(localStorage.getItem("engspeak_shadowing_history_v1") || "[]");
      expect(rawHistory).toHaveLength(1);
      expect(rawHistory[0].youtubeId).toBe("genuine_yt1");
    });
  });
});
