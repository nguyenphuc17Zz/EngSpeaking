import { describe, it, expect } from "vitest";
import {
  CORODOMO_VIDEO_PRESETS,
  extractYouTubeVideoId,
} from "@/lib/foundation/shadowing/corodomo-presets";
import { computeShadowingScore } from "@/lib/foundation/shadowing/pronunciation-scorer";
import { getSentenceWordsWithIpa, getWordIpa } from "@/lib/foundation/shadowing/ipa-dictionary";

describe("Corodomo Video Shadowing Studio", () => {
  describe("CORODOMO_VIDEO_PRESETS", () => {
    it("has BBC Office English Episode 1 (k188_aGDklQ) as the primary flagship preset", () => {
      const defaultPreset = CORODOMO_VIDEO_PRESETS[0];
      expect(defaultPreset.youtubeId).toBe("k188_aGDklQ");
      expect(defaultPreset.title).toContain("Work emails: Office English");
      expect(defaultPreset.segments.length).toBeGreaterThanOrEqual(200);
    });

    it("has Travel and Holidays Level A1 (gFkNhGDd8Ws) in the presets", () => {
      const travelPreset = CORODOMO_VIDEO_PRESETS.find((p) => p.youtubeId === "gFkNhGDd8Ws");
      expect(travelPreset).toBeDefined();
      expect(travelPreset!.cefrLevel).toBe("A1");
      expect(travelPreset!.playlistName).toBe("Travel and Holidays");
    });

    it("has valid timestamps and bilingual content for each segment", () => {
      for (const preset of CORODOMO_VIDEO_PRESETS) {
        expect(preset.segments.length).toBeGreaterThan(0);
        for (const seg of preset.segments) {
          expect(seg.text.trim().length).toBeGreaterThan(0);
          expect(seg.start_time).toBeGreaterThanOrEqual(0);
          expect(seg.end_time).toBeGreaterThan(seg.start_time);
          expect(seg.translationVi).toBeDefined();
          expect(seg.thoughtGroups).toBeDefined();
        }
      }
    });
  });

  describe("extractYouTubeVideoId", () => {
    it("extracts 11-char ID from standard watch URLs", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=gFkNhGDd8Ws")).toBe("gFkNhGDd8Ws");
      expect(extractYouTubeVideoId("https://youtube.com/watch?v=gFkNhGDd8Ws&feature=share")).toBe("gFkNhGDd8Ws");
    });

    it("extracts ID from youtu.be shortlinks", () => {
      expect(extractYouTubeVideoId("https://youtu.be/gFkNhGDd8Ws")).toBe("gFkNhGDd8Ws");
    });

    it("extracts ID from youtube shorts URLs", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/shorts/gFkNhGDd8Ws")).toBe("gFkNhGDd8Ws");
    });

    it("extracts ID from embed URLs", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/embed/gFkNhGDd8Ws?enablejsapi=1")).toBe("gFkNhGDd8Ws");
    });

    it("handles bare 11-character video IDs", () => {
      expect(extractYouTubeVideoId("gFkNhGDd8Ws")).toBe("gFkNhGDd8Ws");
    });

    it("returns null for invalid inputs", () => {
      expect(extractYouTubeVideoId("")).toBeNull();
      expect(extractYouTubeVideoId("not-a-youtube-url")).toBeNull();
    });
  });

  describe("computeShadowingScore on Corodomo segments", () => {
    it("computes accurate pronunciation score for exact match", () => {
      const reference = "Do you like traveling?";
      const spoken = "Do you like traveling";

      const score = computeShadowingScore(reference, spoken, 2500, 2500);

      expect(score.accuracy).toBeGreaterThanOrEqual(90);
      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.correctWords.map((w) => w.toLowerCase())).toContain("traveling");
      expect(score.missedWords).toHaveLength(0);
    });

    it("identifies omitted and mispronounced words in learner speech", () => {
      const reference = "We went swimming and ate delicious seafood.";
      const spoken = "We went and ate food";

      const score = computeShadowingScore(reference, spoken, 2500, 3000);

      expect(score.overall).toBeLessThan(80);
      expect(score.missedWords.map((w) => w.toLowerCase())).toContain("swimming");
      expect(score.coachRemarkVi.length).toBeGreaterThan(0);
    });
  });

  describe("IPA Dictionary & Converter", () => {
    it("provides accurate IPA for common words from Corodomo lesson", () => {
      expect(getWordIpa("emails")).toBe("ˈiːmeɪlz");
      expect(getWordIpa("formal")).toBe("ˈfɔːməl");
      expect(getWordIpa("informal")).toBe("ɪnˈfɔːməl");
      expect(getWordIpa("smiley")).toBe("ˈsmaɪli");
      expect(getWordIpa("difficult")).toBe("ˈdɪfɪkəlt");
    });

    it("parses sentence into tokens with IPA on top of each word", () => {
      const sentence = "Emails. Should they be formal?";
      const tokens = getSentenceWordsWithIpa(sentence);

      expect(tokens.length).toBeGreaterThan(0);
      const formalToken = tokens.find((t) => t.cleanWord === "formal");
      expect(formalToken).toBeDefined();
      expect(formalToken!.ipa).toBe("ˈfɔːməl");
    });
  });

  describe("YouTube Transcript API Route", () => {
    it("handles Custom Script input by generating enriched segments with IPA", async () => {
      const { POST } = await import("@/app/api/shadowing/youtube-transcript/route");
      const fakeReq = {
        json: async () => ({
          customScript: "Emails. Should they be formal? Friendly? It can be difficult to know.",
          videoId: "k188_aGDklQ",
        }),
      } as any;

      const res = await POST(fakeReq);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.segments.length).toBeGreaterThanOrEqual(1);
      expect(data.segments[0].wordsWithIpa).toBeDefined();
      expect(data.segments[0].ipa.length).toBeGreaterThan(0);
    });

    it("returns 400 error for empty or invalid video URL", async () => {
      const { POST } = await import("@/app/api/shadowing/youtube-transcript/route");
      const fakeReq = {
        json: async () => ({ url: "not-a-valid-url" }),
      } as any;

      const res = await POST(fakeReq);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe("Shadowing Watch & Practice History Service", () => {
    it("saves and retrieves lesson practice history in localStorage", async () => {
      const {
        getShadowingHistory,
        saveToShadowingHistory,
        removeFromShadowingHistory,
        clearShadowingHistory,
      } = await import("@/lib/foundation/shadowing/shadowing-history.service");

      clearShadowingHistory();
      expect(getShadowingHistory()).toEqual([]);

      const sampleLesson = CORODOMO_VIDEO_PRESETS[0];
      const saved = saveToShadowingHistory(sampleLesson, 5, 88.5, 4);

      expect(saved.length).toBe(1);
      expect(saved[0].youtubeId).toBe(sampleLesson.youtubeId);
      expect(saved[0].completedSegments).toBe(5);
      expect(saved[0].averageScore).toBe(88.5);

      const fetched = getShadowingHistory();
      expect(fetched.length).toBe(1);
      expect(fetched[0].title).toBe(sampleLesson.title);

      const afterRemove = removeFromShadowingHistory(sampleLesson.youtubeId);
      expect(afterRemove.length).toBe(0);
      expect(getShadowingHistory()).toEqual([]);
    });
  });

  describe("Shadowing Video Library CRUD Service", () => {
    it("initializes with presets and allows adding, editing, deleting, and resetting", async () => {
      const {
        getVideoLibrary,
        addVideoToLibrary,
        updateVideoInLibrary,
        deleteVideoFromLibrary,
        resetVideoLibraryToDefaults,
      } = await import("@/lib/foundation/shadowing/shadowing-library.service");

      // Reset to defaults
      const defaults = resetVideoLibraryToDefaults();
      expect(defaults.length).toBe(CORODOMO_VIDEO_PRESETS.length);
      expect(defaults[0].youtubeId).toBe(CORODOMO_VIDEO_PRESETS[0].youtubeId);

      // Create: Add new custom video
      const customLesson = {
        ...CORODOMO_VIDEO_PRESETS[0],
        id: "custom_video_xyz99",
        youtubeId: "xyz99Custom",
        title: "My Custom English Vlog",
        channel: "English Mastery",
        cefrLevel: "B2",
      };
      const afterAdd = addVideoToLibrary(customLesson);
      expect(afterAdd.length).toBe(defaults.length + 1);
      expect(afterAdd[0].youtubeId).toBe("xyz99Custom");
      expect(afterAdd[0].isCustom).toBe(true);

      // Read: Get video library
      const library = getVideoLibrary();
      expect(library.find((v) => v.youtubeId === "xyz99Custom")).toBeDefined();

      // Update: Edit title and CEFR level
      const afterUpdate = updateVideoInLibrary("xyz99Custom", {
        title: "Updated Vlog Title",
        cefrLevel: "C1",
      });
      const updatedItem = afterUpdate.find((v) => v.youtubeId === "xyz99Custom");
      expect(updatedItem).toBeDefined();
      expect(updatedItem!.title).toBe("Updated Vlog Title");
      expect(updatedItem!.cefrLevel).toBe("C1");

      // Delete: Remove custom video
      const afterDelete = deleteVideoFromLibrary("custom_video_xyz99");
      expect(afterDelete.find((v) => v.youtubeId === "xyz99Custom")).toBeUndefined();
      expect(afterDelete.length).toBe(defaults.length);

      // Reset to defaults
      const resetAgain = resetVideoLibraryToDefaults();
      expect(resetAgain.length).toBe(CORODOMO_VIDEO_PRESETS.length);
    });
  });
});

