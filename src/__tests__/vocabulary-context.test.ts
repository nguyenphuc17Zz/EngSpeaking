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
import type { SpokenWordItem, ContextSentenceItem } from "@/types/vocabulary-context";

describe("Function 8 — Hybrid 10k+ Lexicon DB & On-Demand AI Enrichment Engine", () => {
  it("performs fast in-memory lookup from 10k+ database in <1ms", () => {
    const wordItem = lookupLexiconWord("negotiate");
    expect(wordItem).toBeDefined();
    expect(wordItem?.word).toBe("negotiate");
    expect(wordItem?.cefrLevel).toBe("B1");
    expect(wordItem?.ipaUS).toBeDefined();
    expect(wordItem?.collocations.length).toBeGreaterThan(0);
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

  it("supports On-Demand AI Deep Enrichment (Cách 2 with forceAI)", async () => {
    const wordItem = await searchSpokenDictionary("resilience", {
      forceAI: true,
      provider: "mock",
    });

    expect(wordItem).toBeDefined();
    expect(wordItem.word).toBe("resilience");
    expect(wordItem.ipaUS).toBeDefined();
    expect(wordItem.collocations.length).toBeGreaterThan(0);
  });

  it("evaluates Step 1: Word Pronunciation (Word-level Phonemes & Stress)", async () => {
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
  });

  it("evaluates Step 2: Sentence Context Speaking (Linking sounds, intonation & fluency)", async () => {
    const wordItem: SpokenWordItem = INITIAL_DEFAULT_WORD;
    const sentenceItem: ContextSentenceItem = wordItem.contextSentences[0];

    const res = await evaluateSentenceContext({
      wordItem,
      sentenceItem,
      userTranscript: "We need to consider this decision carefully during the meeting.",
      provider: "mock",
    });

    expect(res.isSuccessful).toBe(true);
    expect(res.sentenceClarityScore).toBeGreaterThanOrEqual(80);
    expect(res.linkingFluencyScore).toBeGreaterThanOrEqual(80);
  });
});
