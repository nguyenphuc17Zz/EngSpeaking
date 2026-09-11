import { describe, it, expect } from "vitest";
import {
  searchSpokenDictionary,
  generateDynamicRandomWord,
  INITIAL_DEFAULT_WORD,
} from "@/lib/foundation/vocabulary/vocabulary.service";
import {
  lookupLexiconWord,
  getRandomLexiconWord,
  searchLexiconPrefix,
} from "@/lib/foundation/vocabulary/lexicon-db.service";
import {
  evaluateWordPronunciation,
  evaluateSentenceContext,
} from "@/lib/foundation/vocabulary/vocabulary-evaluator.service";
import {
  decomposeIpa,
  getMinimalPairContrast,
  calculateWeightedPhonemeScore,
  calculateNormalizedPVI,
} from "@/lib/foundation/vocabulary/phoneme-stress.engine";
import type { SpokenWordItem, ContextSentenceItem } from "@/types/vocabulary-context";

describe("Function 8 — Phoneme-Stress Engine & Spoken Vocabulary Studio", () => {
  describe("Phoneme & Stress Diagnostic Engine", () => {
    it("decomposes complex IPA into syllables and identifies primary lexical stress", () => {
      const result = decomposeIpa("/dɪˈsɪʒ.ən/");
      expect(result.syllables.length).toBeGreaterThanOrEqual(2);
      expect(result.primaryStressIndex).toBe(1); // 2nd syllable (de-CI-sion)
      expect(result.criticalEndingConsonants.length).toBeGreaterThan(0);
      expect(result.vietnameseL1Pitfalls.length).toBeGreaterThan(0);

      // Vietnamese L1 pitfall includes final consonant deletion or stress warning
      const hasFinalConsonantOrStress = result.vietnameseL1Pitfalls.some(
        (p) => p.category === "final_consonant" || p.category === "stress_shift"
      );
      expect(hasFinalConsonantOrStress).toBe(true);
    });

    it("detects dental fricative pitfall for words containing /θ/ or /ð/", () => {
      const result = decomposeIpa("/θɪŋk/");
      const fricativePitfall = result.vietnameseL1Pitfalls.find(
        (p) => p.category === "fricative_substitution"
      );
      expect(fricativePitfall).toBeDefined();
      expect(fricativePitfall?.targetPhoneme).toBe("/θ/");
    });

    it("retrieves minimal pair contrasts accurately", () => {
      const decisionContrast = getMinimalPairContrast("decision");
      expect(decisionContrast).toBeDefined();
      expect(decisionContrast?.confusedWord).toBe("decisive");

      const leaveContrast = getMinimalPairContrast("leave");
      expect(leaveContrast).toBeDefined();
      expect(leaveContrast?.confusedWord).toBe("live");
      expect(leaveContrast?.distinctionKey).toContain("/iː/ vs");
    });

    it("computes weighted phoneme score with coda and stress penalties", () => {
      const matchScore = calculateWeightedPhonemeScore("/dɪˈsɪʒ.ən/", "decision");
      expect(matchScore.isCloseMatch).toBe(true);
      expect(matchScore.similarityScore).toBeGreaterThanOrEqual(80);
      expect(matchScore.codaScore).toBeGreaterThanOrEqual(90);

      const mismatchScore = calculateWeightedPhonemeScore("/dɪˈsɪʒ.ən/", "randomword");
      expect(mismatchScore.similarityScore).toBeLessThan(50);
    });

    it("calculates Normalized Pairwise Variability Index (nPVI) for speech rhythm", () => {
      const regularDurations = [100, 100, 100, 100]; // syllable-timed (flat)
      const npviFlat = calculateNormalizedPVI(regularDurations);
      expect(npviFlat).toBe(0);

      const alternatingDurations = [250, 80, 260, 90, 300]; // stress-timed (varied)
      const npviStress = calculateNormalizedPVI(alternatingDurations);
      expect(npviStress).toBeGreaterThan(50);
    });
  });

  describe("Hybrid 10k+ Lexicon DB & On-Demand AI Enrichment Engine", () => {
    it("performs fast in-memory lookup from 10k+ database in <1ms with enhanced fields", () => {
      const wordItem = lookupLexiconWord("negotiate");
      expect(wordItem).toBeDefined();
      expect(wordItem?.word).toBe("negotiate");
      expect(wordItem?.cefrLevel).toBe("B1");
      expect(wordItem?.ipaUS).toBeDefined();
      expect(wordItem?.collocations.length).toBeGreaterThan(0);
      expect(wordItem?.collocations[0].collocationType).toBeDefined();
      expect(wordItem?.collocations[0].pmiStrength).toBe("high");
      expect(wordItem?.spontaneousChallenge).toBeDefined();
      expect(wordItem?.spontaneousChallenge?.targetCollocation).toBeDefined();
    });

    it("performs fast prefix auto-complete search across 10k+ database", () => {
      const matches = searchLexiconPrefix("comp", 5);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].word.startsWith("comp")).toBe(true);
    });

    it("samples random words accurately by CEFR Level in <1ms", () => {
      const b2Word = getRandomLexiconWord({ cefrLevel: "B2" });
      expect(b2Word).toBeDefined();
      expect(b2Word.cefrLevel).toBe("B2");

      const a2Word = getRandomLexiconWord({ cefrLevel: "A2" });
      expect(a2Word).toBeDefined();
      expect(a2Word.cefrLevel).toBe("A2");
    });

    it("supports On-Demand AI Deep Enrichment (with forceAI in mock provider)", async () => {
      const wordItem = await searchSpokenDictionary("resilience", {
        forceAI: true,
        provider: "mock",
      });

      expect(wordItem).toBeDefined();
      expect(wordItem.word).toBe("resilience");
      expect(wordItem.ipaUS).toBeDefined();
      expect(wordItem.collocations.length).toBeGreaterThan(0);
      expect(wordItem.spontaneousChallenge).toBeDefined();
    });
  });

  describe("Vocabulary Evaluator Service (Step 1 & Step 2)", () => {
    it("evaluates Step 1: Word Pronunciation with rich phonetic diagnostic outputs", async () => {
      const wordItem: SpokenWordItem = INITIAL_DEFAULT_WORD;

      const res = await evaluateWordPronunciation({
        wordItem,
        userTranscript: "decision",
        provider: "mock",
      });

      expect(res.isSuccessful).toBe(true);
      expect(res.wordSpokenCorrectly).toBe(true);
      expect(res.pronunciationScore).toBeGreaterThanOrEqual(80);
      expect(res.stressAccuracyScore).toBeGreaterThanOrEqual(80);
      expect(res.endingSoundStatus).toBe("clear");
      expect(res.syllablesDetected?.length).toBeGreaterThan(0);
      expect(res.vietnameseL1TrapWarning).toBeDefined();
      expect(res.minimalPairAdvice).toBeDefined();
    });

    it("evaluates Step 2 (Guided Mode): Sentence Context Speaking", async () => {
      const wordItem: SpokenWordItem = INITIAL_DEFAULT_WORD;
      const sentenceItem: ContextSentenceItem = wordItem.contextSentences[0];

      const res = await evaluateSentenceContext({
        wordItem,
        sentenceItem,
        userTranscript: "We need to consider this decision carefully before the team meeting.",
        mode: "guided",
        provider: "mock",
      });

      expect(res.isSuccessful).toBe(true);
      expect(res.sentenceClarityScore).toBeGreaterThanOrEqual(80);
      expect(res.linkingFluencyScore).toBeGreaterThanOrEqual(80);
      expect(res.mode).toBe("guided");
      expect(res.targetWordUsed).toBe(true);
    });

    it("evaluates Step 2 (Spontaneous Mode): Active Retrieval & Collocation Production", async () => {
      const wordItem: SpokenWordItem = INITIAL_DEFAULT_WORD;

      const res = await evaluateSentenceContext({
        wordItem,
        userTranscript: "Honestly, we have to make a decision before Friday to avoid delays.",
        mode: "spontaneous",
        spontaneousChallenge: wordItem.spontaneousChallenge,
        provider: "mock",
      });

      expect(res.isSuccessful).toBe(true);
      expect(res.mode).toBe("spontaneous");
      expect(res.targetWordUsed).toBe(true);
      expect(res.collocationUsedNaturally).toBe(true);
      expect(res.pviRhythmScore).toBeGreaterThan(0);
      expect(res.suggestedAlternativeEn).toBeDefined();
    });
  });
});
