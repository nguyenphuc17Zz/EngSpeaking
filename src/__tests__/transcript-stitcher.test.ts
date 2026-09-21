import { describe, it, expect } from "vitest";
import {
  stitchTranscriptSegments,
  generateThoughtGroups,
} from "@/lib/foundation/shadowing/transcript-stitcher";
import { parseTranscriptXml } from "@/app/api/shadowing/youtube-transcript/route";

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

    it("heals 1-word orphan fragments like 'middle.' into the preceding sentence", () => {
      const fragments = [
        {
          text: "Yeah. Not just vocabulary list, but feelings you can actually say when life is good, messy, or somewhere in the",
          start_time: 1.0,
          end_time: 6.5,
        },
        { text: "middle.", start_time: 6.6, end_time: 7.2 },
      ];

      const stitched = stitchTranscriptSegments(fragments);
      expect(stitched.length).toBe(1);
      expect(stitched[0].text).toBe(
        "Yeah. Not just vocabulary list, but feelings you can actually say when life is good, messy, or somewhere in the middle."
      );
      expect(stitched[0].end_time).toBe(7.2);
    });

    it("heals 2-word continuation fragments like 'and use.' into preceding sentences", () => {
      const fragments = [
        {
          text: "down and put real emotions into real sentences in easy English you can copy",
          start_time: 10.0,
          end_time: 14.5,
        },
        { text: "and use.", start_time: 14.6, end_time: 15.5 },
      ];

      const stitched = stitchTranscriptSegments(fragments);
      expect(stitched.length).toBe(1);
      expect(stitched[0].text).toBe(
        "down and put real emotions into real sentences in easy English you can copy and use."
      );
    });

    it("heals lowercase continuations when preceding fragment lacks terminal punctuation", () => {
      const fragments = [
        {
          text: "And try to answer in a full",
          start_time: 2.0,
          end_time: 3.5,
        },
        { text: "mini sentence, not just one word.", start_time: 3.6, end_time: 6.0 },
      ];

      const stitched = stitchTranscriptSegments(fragments);
      expect(stitched.length).toBe(1);
      expect(stitched[0].text).toBe("And try to answer in a full mini sentence, not just one word.");
    });

    it("preserves genuine short standalone interjections like 'Yes.' and 'No.'", () => {
      const fragments = [
        { text: "Do you like travelling?", start_time: 1.0, end_time: 2.5 },
        { text: "Yes.", start_time: 3.0, end_time: 3.8 },
        { text: "I really enjoy visiting new places.", start_time: 4.0, end_time: 6.5 },
      ];

      const stitched = stitchTranscriptSegments(fragments);
      expect(stitched.length).toBe(3);
      expect(stitched[1].text).toBe("Yes.");
    });

    it("correctly handles sentence boundary spillover across chunk boundaries (e.g. 'is already' -> 'great.')", () => {
      const fragments = [
        {
          text: ">> And we'd love it if you write a comment, too. Just one simple sentence is already",
          start_time: 10.0,
          end_time: 15.0,
        },
        {
          text: "great. Like, what's your name and where are you from?",
          start_time: 15.0,
          end_time: 20.0,
        },
      ];

      const stitched = stitchTranscriptSegments(fragments);

      // Should split into exactly 3 complete, natural sentences
      expect(stitched.length).toBe(3);

      // Sentence 1
      expect(stitched[0].text).toBe(">> And we'd love it if you write a comment, too.");
      expect(stitched[0].start_time).toBe(10.0);
      expect(stitched[0].end_time).toBeLessThan(15.0);

      // Sentence 2 - 'great.' is correctly united with 'is already'!
      expect(stitched[1].text).toBe("Just one simple sentence is already great.");
      expect(stitched[1].start_time).toBe(stitched[0].end_time);
      expect(stitched[1].end_time).toBeGreaterThan(15.0);

      // Sentence 3
      expect(stitched[2].text).toBe("Like, what's your name and where are you from?");
      expect(stitched[2].start_time).toBe(stitched[1].end_time);
      expect(stitched[2].end_time).toBe(20.0);
    });

    it("handles multiple sentence spillovers with continuous and valid timestamps", () => {
      const fragments = [
        { text: "This is the first sentence.", start_time: 0.0, end_time: 2.0 },
        { text: "Here is the second part that", start_time: 2.0, end_time: 3.5 },
        { text: "continues nicely. And the third starts right here.", start_time: 3.5, end_time: 6.0 },
      ];

      const stitched = stitchTranscriptSegments(fragments);
      expect(stitched.length).toBe(3);
      expect(stitched[0].text).toBe("This is the first sentence.");
      expect(stitched[1].text).toBe("Here is the second part that continues nicely.");
      expect(stitched[2].text).toBe("And the third starts right here.");

      for (let i = 0; i < stitched.length; i++) {
        expect(stitched[i].start_time).toBeLessThan(stitched[i].end_time);
        if (i > 0) {
          expect(stitched[i].start_time).toBeGreaterThanOrEqual(stitched[i - 1].start_time);
        }
      }
    });

    it("preserves compound sentences without splitting before coordinating conjunctions when sentence is not finished", () => {
      const fragments = [
        {
          text: "Hey English learners, welcome back to the English Leap Podcast, your English podcast for real conversation practice",
          start_time: 1.0,
          end_time: 8.5,
        },
        {
          text: "and easy English in daily life.",
          start_time: 8.8,
          end_time: 11.2,
        },
      ];

      const stitched = stitchTranscriptSegments(fragments);

      // Must be united into exactly 1 complete grammatical sentence
      expect(stitched.length).toBe(1);
      expect(stitched[0].text).toBe(
        "Hey English learners, welcome back to the English Leap Podcast, your English podcast for real conversation practice and easy English in daily life."
      );
      expect(stitched[0].start_time).toBe(1.0);
      expect(stitched[0].end_time).toBe(11.2);
      expect(stitched[0].thoughtGroups).toBeDefined();
    });

    it("accurately handles interrupted trailing words before speaker turns with ellipsis and clamps timestamps", () => {
      // Simulates exact podcast scenario: Jake saying "I'm from England. I..." before Anna interrupts ">> And then..."
      const fragments = [
        { text: "In my head, I was repeating, 'My name is Jake.", start_time: 209.0, end_time: 211.8 },
        { text: "I'm", start_time: 212.0, end_time: 212.24 },
        { text: "from", start_time: 212.24, end_time: 212.56 },
        { text: "England.", start_time: 212.56, end_time: 213.44 },
        { text: "I", start_time: 213.44, end_time: 216.08 },
        { text: ">> And then the brain did something different, right?", start_time: 214.5, end_time: 219.8 },
      ];

      const stitched = stitchTranscriptSegments(fragments);

      // Find the "I'm from England" segment
      const englandSeg = stitched.find((s) => s.text.includes("I'm from England"));
      expect(englandSeg).toBeDefined();

      // Must start at 212.0s (start of "I'm"), NOT 213.1s!
      expect(englandSeg!.start_time).toBe(212.0);

      // Must end at or before 214.5s with natural acoustic margin (preventing audio collision)!
      expect(englandSeg!.end_time).toBeLessThanOrEqual(214.5);
      expect(englandSeg!.end_time).toBeGreaterThanOrEqual(214.4);

      // Must have ellipsis indicating interrupted speech trail
      expect(englandSeg!.text).toBe("I'm from England. I...");

      // Next segment must start at 214.5s
      const nextSeg = stitched.find((s) => s.text.startsWith(">> And then"));
      expect(nextSeg).toBeDefined();
      expect(nextSeg!.start_time).toBe(214.5);
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

  describe("parseTranscriptXml", () => {
    it("extracts word-level millisecond precision from srv3 <s> tags", () => {
      const xml = `<transcript>
        <p t="210959" d="5121" w="1">
          <s ac="0">name</s>
          <s t="161" ac="0"> is</s>
          <s t="401" ac="0"> Jake.</s>
          <s t="1041" ac="0"> I&#39;m</s>
          <s t="1280" ac="0"> from</s>
          <s t="1601" ac="0"> England.</s>
          <s t="2481" ac="0"> I</s>
        </p>
      </transcript>`;

      const rawSegments = parseTranscriptXml(xml);
      expect(rawSegments.length).toBe(7);

      // Verify "name"
      expect(rawSegments[0].text).toBe("name");
      expect(rawSegments[0].start_time).toBe(210.96);

      // Verify "I'm" starts at 210.959 + 1.041 = 212.00s
      expect(rawSegments[3].text).toBe("I'm");
      expect(rawSegments[3].start_time).toBe(212.0);

      // Verify "England." starts at 210.959 + 1.601 = 212.56s
      expect(rawSegments[5].text).toBe("England.");
      expect(rawSegments[5].start_time).toBe(212.56);
    });
  });
});
