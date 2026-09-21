import { describe, it, expect, beforeEach } from "vitest";
import {
  saveTranscript,
  getTranscript,
  deleteTranscript,
  clearAllTranscripts,
} from "@/lib/foundation/shadowing/shadowing-transcript-db.service";
import type { CorodomoSegment } from "@/lib/foundation/shadowing/corodomo-presets";

describe("Shadowing Transcript DB Service (IndexedDB / Memory)", () => {
  beforeEach(async () => {
    await clearAllTranscripts();
  });

  const mockSegments: CorodomoSegment[] = [
    {
      segment_id: "seg_001",
      text: "Hello, world! Welcome to English learning.",
      start_time: 0.5,
      end_time: 3.2,
      translationVi: "Xin chào thế giới! Chào mừng đến với học tiếng Anh.",
    },
    {
      segment_id: "seg_002",
      text: "Practice makes perfect every day.",
      start_time: 3.5,
      end_time: 6.8,
      translationVi: "Có công mài sắt, có ngày nên kim.",
    },
  ];

  it("returns null when transcript is not found", async () => {
    const result = await getTranscript("nonexistent_id_999");
    expect(result).toBeNull();
  });

  it("saves and retrieves transcript correctly", async () => {
    await saveTranscript("vid_abc12345", mockSegments);
    const retrieved = await getTranscript("vid_abc12345");

    expect(retrieved).not.toBeNull();
    expect(retrieved).toHaveLength(2);
    expect(retrieved?.[0].text).toBe("Hello, world! Welcome to English learning.");
    expect(retrieved?.[1].end_time).toBe(6.8);
  });

  it("updates existing transcript for same video ID", async () => {
    await saveTranscript("vid_update", mockSegments);

    const updatedSegments: CorodomoSegment[] = [
      ...mockSegments,
      {
        segment_id: "seg_003",
        text: "Never give up on your dreams.",
        start_time: 7.0,
        end_time: 9.5,
        translationVi: "Đừng bao giờ từ bỏ ước mơ.",
      },
    ];

    await saveTranscript("vid_update", updatedSegments);
    const retrieved = await getTranscript("vid_update");

    expect(retrieved).toHaveLength(3);
    expect(retrieved?.[2].text).toBe("Never give up on your dreams.");
  });

  it("deletes transcript properly", async () => {
    await saveTranscript("vid_to_delete", mockSegments);
    expect(await getTranscript("vid_to_delete")).not.toBeNull();

    await deleteTranscript("vid_to_delete");
    expect(await getTranscript("vid_to_delete")).toBeNull();
  });

  it("clears all transcripts", async () => {
    await saveTranscript("vid_1", mockSegments);
    await saveTranscript("vid_2", mockSegments);

    expect(await getTranscript("vid_1")).not.toBeNull();
    expect(await getTranscript("vid_2")).not.toBeNull();

    await clearAllTranscripts();

    expect(await getTranscript("vid_1")).toBeNull();
    expect(await getTranscript("vid_2")).toBeNull();
  });
});
