import { describe, it, expect } from "vitest";
import {
  matchesUploadDateFilter,
  matchesChannelFilter,
  sortVideosByDate,
  parseRelativeTimeToTimestamp,
} from "@/app/(foundation)/shadowing/page";
import type { SavedVideoLesson } from "@/lib/foundation/shadowing/shadowing-library.service";

describe("Shadowing Hub Filters", () => {
  const createMockLesson = (
    overrides: Partial<SavedVideoLesson> = {}
  ): SavedVideoLesson => ({
    id: "test_1",
    youtubeId: "vid_123",
    title: "Test Lesson",
    channel: "English Channel",
    cefrLevel: "B2",
    playlistName: "Daily Speaking",
    playlistId: "pl_1",
    thumbnail: "https://example.com/thumb.jpg",
    duration: "04:30",
    segments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  describe("Upload Date Filter (matchesUploadDateFilter)", () => {
    it("should always match when filter is 'all'", () => {
      const lesson = createMockLesson({
        publishedAt: new Date(Date.now() - 365 * 24 * 3600 * 1000 * 5).toISOString(),
      });
      expect(matchesUploadDateFilter(lesson, "all")).toBe(true);
    });

    it("should correctly identify videos published today (< 24 hours)", () => {
      const todayLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      });
      const oldLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      });

      expect(matchesUploadDateFilter(todayLesson, "today")).toBe(true);
      expect(matchesUploadDateFilter(oldLesson, "today")).toBe(false);
    });

    it("should fallback to publishedText for today when publishedAt is missing", () => {
      const lessonHours = createMockLesson({
        publishedAt: undefined,
        publishedText: "4 giờ trước",
      });
      const lessonToday = createMockLesson({
        publishedAt: undefined,
        publishedText: "Streamed today",
      });
      const lessonMonth = createMockLesson({
        publishedAt: undefined,
        publishedText: "2 tháng trước",
      });

      expect(matchesUploadDateFilter(lessonHours, "today")).toBe(true);
      expect(matchesUploadDateFilter(lessonToday, "today")).toBe(true);
      expect(matchesUploadDateFilter(lessonMonth, "today")).toBe(false);
    });

    it("should correctly identify videos published this week (<= 7 days)", () => {
      const weekLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      });
      const monthOldLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      });

      expect(matchesUploadDateFilter(weekLesson, "this_week")).toBe(true);
      expect(matchesUploadDateFilter(monthOldLesson, "this_week")).toBe(false);
    });

    it("should correctly identify videos published this month (<= 31 days)", () => {
      const threeWeeksLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
      });
      const twoMonthsLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      });

      expect(matchesUploadDateFilter(threeWeeksLesson, "this_month")).toBe(true);
      expect(matchesUploadDateFilter(twoMonthsLesson, "this_month")).toBe(false);
    });

    it("should correctly identify videos published this year (<= 365 days)", () => {
      const halfYearLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString(),
      });
      const twoYearsOldLesson = createMockLesson({
        publishedAt: new Date(Date.now() - 750 * 24 * 3600 * 1000).toISOString(),
      });

      expect(matchesUploadDateFilter(halfYearLesson, "this_year")).toBe(true);
      expect(matchesUploadDateFilter(twoYearsOldLesson, "this_year")).toBe(false);
    });
  });

  describe("Duration Filtering Simulation", () => {
    const parseDurationSec = (durationStr?: string): number => {
      if (!durationStr) return 300;
      const parts = durationStr.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return 300;
    };

    const filterByCustomDuration = (
      durationStr: string,
      minMin: string,
      maxMin: string
    ) => {
      const sec = parseDurationSec(durationStr);
      const minVal = parseFloat(minMin);
      const maxVal = parseFloat(maxMin);
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
    };

    it("should filter properly when both min and max are specified (e.g. 3 to 7 min)", () => {
      expect(filterByCustomDuration("02:50", "3", "7")).toBe(false);
      expect(filterByCustomDuration("03:15", "3", "7")).toBe(true);
      expect(filterByCustomDuration("06:59", "3", "7")).toBe(true);
      expect(filterByCustomDuration("07:30", "3", "7")).toBe(false);
    });

    it("should handle swapped min and max gracefully (e.g. min 7, max 3)", () => {
      expect(filterByCustomDuration("04:30", "7", "3")).toBe(true);
      expect(filterByCustomDuration("08:00", "7", "3")).toBe(false);
    });

    it("should handle only min or only max correctly", () => {
      expect(filterByCustomDuration("05:00", "4", "")).toBe(true);
      expect(filterByCustomDuration("03:00", "4", "")).toBe(false);
      expect(filterByCustomDuration("04:00", "", "5")).toBe(true);
      expect(filterByCustomDuration("06:00", "", "5")).toBe(false);
    });
  });

  describe("Sort Videos by Date (sortVideosByDate)", () => {
    it("should sort videos with newest first by default", () => {
      const older = createMockLesson({
        id: "v1",
        title: "Old Video",
        publishedAt: "2024-01-01T00:00:00Z",
      });
      const newer = createMockLesson({
        id: "v2",
        title: "New Video",
        publishedAt: "2026-06-01T00:00:00Z",
      });
      const newest = createMockLesson({
        id: "v3",
        title: "Newest Video",
        publishedAt: "2026-09-20T00:00:00Z",
      });

      const sorted = sortVideosByDate([older, newest, newer], "newest");
      expect(sorted.map((v: any) => v.id)).toEqual(["v3", "v2", "v1"]);
    });

    it("should sort videos with oldest first when requested", () => {
      const older = createMockLesson({
        id: "v1",
        publishedAt: "2024-01-01T00:00:00Z",
      });
      const newer = createMockLesson({
        id: "v2",
        publishedAt: "2026-06-01T00:00:00Z",
      });
      const newest = createMockLesson({
        id: "v3",
        publishedAt: "2026-09-20T00:00:00Z",
      });

      const sorted = sortVideosByDate([newest, older, newer], "oldest");
      expect(sorted.map((v: any) => v.id)).toEqual(["v1", "v2", "v3"]);
    });

    it("should fallback to createdAt when publishedAt is missing", () => {
      const vCreatedOld = createMockLesson({
        id: "c1",
        publishedAt: undefined,
        createdAt: "2025-01-01T00:00:00Z",
      });
      const vCreatedNew = createMockLesson({
        id: "c2",
        publishedAt: undefined,
        createdAt: "2026-05-01T00:00:00Z",
      });

      const sorted = sortVideosByDate([vCreatedOld, vCreatedNew], "newest");
      expect(sorted[0].id).toBe("c2");
      expect(sorted[1].id).toBe("c1");
    });

    it("should accurately parse relative time strings (Vietnamese and English)", () => {
      const base = 1700000000000;
      expect(parseRelativeTimeToTimestamp("3 ngày trước", base)).toBe(base - 3 * 24 * 3600 * 1000);
      expect(parseRelativeTimeToTimestamp("2 tuần trước", base)).toBe(base - 2 * 7 * 24 * 3600 * 1000);
      expect(parseRelativeTimeToTimestamp("1 tháng trước", base)).toBe(base - 1 * 30 * 24 * 3600 * 1000);
      expect(parseRelativeTimeToTimestamp("2 năm trước", base)).toBe(base - 2 * 365 * 24 * 3600 * 1000);
      expect(parseRelativeTimeToTimestamp("4 hours ago", base)).toBe(base - 4 * 3600 * 1000);
      expect(parseRelativeTimeToTimestamp("Yesterday", base)).toBe(base - 24 * 3600 * 1000);
    });

    it("should sort YouTube channel scraped videos with relative publishedText correctly (newest vs oldest)", () => {
      const now = Date.now();
      const sameCreatedAt = new Date(now).toISOString();

      const vidDays = createMockLesson({
        id: "v_days",
        title: "Days ago lesson",
        publishedAt: undefined,
        publishedText: "2 ngày trước",
        createdAt: sameCreatedAt,
      });

      const vidWeeks = createMockLesson({
        id: "v_weeks",
        title: "Weeks ago lesson",
        publishedAt: undefined,
        publishedText: "3 tuần trước",
        createdAt: sameCreatedAt,
      });

      const vidYear = createMockLesson({
        id: "v_year",
        title: "Year ago lesson",
        publishedAt: undefined,
        publishedText: "1 năm trước",
        createdAt: sameCreatedAt,
      });

      // 1. Sort Newest: 2 days ago > 3 weeks ago > 1 year ago
      const newestFirst = sortVideosByDate([vidWeeks, vidYear, vidDays], "newest");
      expect(newestFirst.map((v) => v.id)).toEqual(["v_days", "v_weeks", "v_year"]);

      // 2. Sort Oldest: 1 year ago > 3 weeks ago > 2 days ago
      const oldestFirst = sortVideosByDate([vidWeeks, vidYear, vidDays], "oldest");
      expect(oldestFirst.map((v) => v.id)).toEqual(["v_year", "v_weeks", "v_days"]);
    });
  });

  describe("Channel Filter (matchesChannelFilter)", () => {
    it("should match when filter is 'all' or empty", () => {
      const lesson = createMockLesson({ channel: "Daily English Podcast" });
      expect(matchesChannelFilter(lesson, "all")).toBe(true);
      expect(matchesChannelFilter(lesson, "")).toBe(true);
    });

    it("should match exact channel names", () => {
      const lesson = createMockLesson({ channel: "Daily English Podcast" });
      expect(matchesChannelFilter(lesson, "Daily English Podcast")).toBe(true);
    });

    it("should match when item channel has trailing or leading whitespace", () => {
      const lessonWithTrailing = createMockLesson({ channel: "Daily English Podcast  " });
      const lessonWithLeading = createMockLesson({ channel: "  Daily English Podcast" });
      const lessonWithNewlines = createMockLesson({ channel: "\nDaily English Podcast\r\n" });

      expect(matchesChannelFilter(lessonWithTrailing, "Daily English Podcast")).toBe(true);
      expect(matchesChannelFilter(lessonWithLeading, "Daily English Podcast")).toBe(true);
      expect(matchesChannelFilter(lessonWithNewlines, "Daily English Podcast")).toBe(true);
    });

    it("should match case-insensitively", () => {
      const lesson = createMockLesson({ channel: "Daily English Podcast" });
      expect(matchesChannelFilter(lesson, "daily english podcast")).toBe(true);
      expect(matchesChannelFilter(lesson, "DAILY ENGLISH PODCAST")).toBe(true);
    });

    it("should match when filter argument itself has whitespace", () => {
      const lesson = createMockLesson({ channel: "Daily English Podcast" });
      expect(matchesChannelFilter(lesson, "  Daily English Podcast  ")).toBe(true);
    });

    it("should return false for different channels", () => {
      const lesson = createMockLesson({ channel: "BBC Learning English" });
      expect(matchesChannelFilter(lesson, "Daily English Podcast")).toBe(false);
    });
  });
});

