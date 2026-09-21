import { describe, it, expect } from "vitest";
import {
  translateRelativeTime,
  extractYtInitialData,
} from "@/app/api/shadowing/youtube-channel/route";

describe("YouTube Channel Scraper Utilities", () => {
  it("translates English relative time strings to Vietnamese", () => {
    expect(translateRelativeTime("12 minutes ago")).toBe("12 phút trước");
    expect(translateRelativeTime("3 hours ago")).toBe("3 giờ trước");
    expect(translateRelativeTime("2 days ago")).toBe("2 ngày trước");
    expect(translateRelativeTime("1 week ago")).toBe("1 tuần trước");
    expect(translateRelativeTime("5 months ago")).toBe("5 tháng trước");
    expect(translateRelativeTime("2 years ago")).toBe("2 năm trước");
    expect(translateRelativeTime("Streamed 3 days ago")).toBe("Đã phát 3 ngày trước");
    expect(translateRelativeTime("Yesterday")).toBe("Hôm qua");
  });

  it("preserves Vietnamese relative time strings", () => {
    expect(translateRelativeTime("12 phút trước")).toBe("12 phút trước");
    expect(translateRelativeTime("3 ngày trước")).toBe("3 ngày trước");
    expect(translateRelativeTime("Hôm qua")).toBe("Hôm qua");
  });

  it("handles empty or undefined relative time gracefully", () => {
    expect(translateRelativeTime("")).toBe("");
    expect(translateRelativeTime(undefined)).toBe("");
  });

  it("extracts ytInitialData JSON object from YouTube HTML payload", () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script>ytInitialData = {"contents":{"tab":"videos"},"sampleId":"test12345"};</script>
        </head>
      </html>
    `;
    const data = extractYtInitialData(mockHtml);
    expect(data).not.toBeNull();
    expect(data.sampleId).toBe("test12345");
    expect(data.contents.tab).toBe("videos");
  });

  it("returns null if ytInitialData is not present", () => {
    const mockHtml = "<html><body>No data here</body></html>";
    expect(extractYtInitialData(mockHtml)).toBeNull();
  });
});
