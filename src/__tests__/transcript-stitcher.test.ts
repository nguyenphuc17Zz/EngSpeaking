import { describe, it, expect } from "vitest";
import {
  stitchTranscriptSegments,
  generateThoughtGroups,
} from "@/lib/foundation/shadowing/transcript-stitcher";

describe("Smart Transcript Stitcher Engine", () => {
  describe("stitchTranscriptSegments", () => {
    it("merges fragmented chunks into complete sentences based on terminal punctuation", () => {
      const rawFragments = [
        { text: "So when you are", start_time: 1.0, end_time: 2.2 },
        { text: "writing an email to your boss,", start_time: 2.2, end_time: 4.0 },
        { text: "it should always be clear.", start_time: 4.1, end_time: 5.5 },
        { text: "Do you agree?", start_time: 5.8, end_time: 7.0 },
      ];

      const stitched = stitchTranscriptSegments(rawFragments);

      expect(stitched.length).toBe(2);

      // Sentence 1
      expect(stitched[0].text).toBe(
        "So when you are writing an email to your boss, it should always be clear."
      );
      expect(stitched[0].start_time).toBe(1.0);
      expect(stitched[0].end_time).toBe(5.5);
      expect(stitched[0].wordsWithIpa).toBeDefined();
      expect(stitched[0].ipa).toBeDefined();
      expect(stitched[0].rawChunkCount).toBe(3);

      // Sentence 2
      expect(stitched[1].text).toBe("Do you agree?");
      expect(stitched[1].start_time).toBe(5.8);
      expect(stitched[1].end_time).toBe(7.0);
    });

    it("splits sentences at natural acoustic pauses (> 550ms) even without punctuation", () => {
      const rawFragments = [
        { text: "welcome to the corporate office", start_time: 0.5, end_time: 2.5 },
        // Acoustic pause: 4.0 - 2.5 = 1.5s (> 0.55s threshold)
        { text: "today we will discuss project timelines", start_time: 4.0, end_time: 6.8 },
      ];

      const stitched = stitchTranscriptSegments(rawFragments);

      expect(stitched.length).toBe(2);
      expect(stitched[0].text).toBe("welcome to the corporate office");
      expect(stitched[0].start_time).toBe(0.5);
      expect(stitched[0].end_time).toBe(2.5);

      expect(stitched[1].text).toBe("today we will discuss project timelines");
      expect(stitched[1].start_time).toBe(4.0);
      expect(stitched[1].end_time).toBe(6.8);
    });

    it("splits overly long sentences at coordinating conjunctions for optimal shadowing", () => {
      const longFragments = [
        { text: "The team analyzed all quarterly reports in detail", start_time: 0.0, end_time: 3.5 },
        { text: "and they found several interesting discrepancies", start_time: 3.5, end_time: 6.5 },
        { text: "because the financial metrics had changed completely.", start_time: 6.6, end_time: 9.5 },
      ];

      const stitched = stitchTranscriptSegments(longFragments, {
        maxWordCount: 12,
        maxSegmentDuration: 6.0,
      });

      expect(stitched.length).toBeGreaterThanOrEqual(2);
      for (const seg of stitched) {
        expect(seg.start_time).toBeLessThan(seg.end_time);
      }
    });

    it("strips YouTube audio annotations like [Music] and [Applause]", () => {
      const fragmentsWithNoise = [
        { text: "[Music]", start_time: 0.0, end_time: 1.5 },
        { text: "Hello everyone,", start_time: 1.6, end_time: 2.5 },
        { text: "welcome back to the channel. [Applause]", start_time: 2.5, end_time: 4.5 },
      ];

      const stitched = stitchTranscriptSegments(fragmentsWithNoise);

      expect(stitched.length).toBe(1);
      expect(stitched[0].text).toBe("Hello everyone, welcome back to the channel.");
      expect(stitched[0].text).not.toContain("[Music]");
      expect(stitched[0].text).not.toContain("[Applause]");
    });

    it("handles empty or invalid inputs gracefully", () => {
      expect(stitchTranscriptSegments([])).toEqual([]);
      expect(stitchTranscriptSegments(null as any)).toEqual([]);
    });
  });

  describe("generateThoughtGroups", () => {
    it("generates natural thought groups with pause markers for compound sentences", () => {
      const sentence =
        "In our previous quarterly meeting, we thoroughly reviewed the project budget and decided to approve the expansion.";
      const thoughtGroups = generateThoughtGroups(sentence);

      expect(thoughtGroups).toContain("/");
      expect(thoughtGroups).toContain("In our previous quarterly meeting,");
    });

    it("returns short sentences without unnecessary slashes", () => {
      const shortSentence = "Nice to meet you.";
      expect(generateThoughtGroups(shortSentence)).toBe("Nice to meet you.");
    });
  });
});
