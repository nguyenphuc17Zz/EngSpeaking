// Smart Transcript Stitcher
// High-Precision Multi-Factor Sentence Alignment & Boundary Stitching Algorithm for YouTube & Speech Transcripts

import { getSentenceWordsWithIpa, type WordIpaToken } from "./ipa-dictionary";
import type { YouTubeTranscriptSegment } from "@/types/shadowing";

export interface StitchedSentenceSegment extends YouTubeTranscriptSegment {
  thoughtGroups?: string;
  ipa?: string;
  wordsWithIpa?: WordIpaToken[];
  rawChunkCount?: number;
}

export interface StitcherOptions {
  /** Minimum duration in seconds before considering a split (default: 2.0s) */
  minSegmentDuration?: number;
  /** Maximum duration in seconds before forcing a conjunction split (default: 8.0s) */
  maxSegmentDuration?: number;
  /** Minimum words in a segment (default: 4) */
  minWordCount?: number;
  /** Maximum words in a segment (default: 20) */
  maxWordCount?: number;
  /** Silence gap in seconds between tokens that indicates an acoustic sentence pause (default: 0.55s) */
  silencePauseThreshold?: number;
}

const DEFAULT_OPTIONS: Required<StitcherOptions> = {
  minSegmentDuration: 2.0,
  maxSegmentDuration: 10.0,
  minWordCount: 4,
  maxWordCount: 26,
  silencePauseThreshold: 0.55,
};

// Common abbreviations that end with a dot but do NOT terminate sentences
const ABBREVIATIONS = new Set([
  "mr.",
  "mrs.",
  "ms.",
  "dr.",
  "prof.",
  "sr.",
  "jr.",
  "vs.",
  "e.g.",
  "i.e.",
  "etc.",
  "u.s.",
  "u.k.",
]);

// Legitimate short standalone interjections in spoken English
const STANDALONE_SHORT_INTERJECTIONS = new Set([
  "yes",
  "no",
  "yeah",
  "yep",
  "nope",
  "sure",
  "ok",
  "okay",
  "right",
  "alright",
  "exactly",
  "hello",
  "hi",
  "hey",
  "thanks",
  "thank you",
  "bye",
  "goodbye",
  "please",
  "welcome",
  "cheers",
  "wow",
  "cool",
  "perfect",
]);

// Grammatical words that can NEVER end a sentence (Dangling Syntax Guard)
const DANGLING_END_WORDS = new Set([
  // Articles & Determiners
  "the",
  "a",
  "an",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "every",
  "some",
  "any",
  "no",
  "each",
  "either",
  "neither",
  // Prepositions
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "of",
  "from",
  "about",
  "into",
  "through",
  "after",
  "over",
  "between",
  "under",
  "without",
  "during",
  "before",
  // Conjunctions
  "and",
  "but",
  "or",
  "so",
  "because",
  "although",
  "though",
  "if",
  "while",
  "when",
  "than",
  "whether",
  // Auxiliary & Modals
  "is",
  "am",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  // Relative pronouns & connectives
  "which",
  "who",
  "whom",
  "whose",
  "where",
  "why",
  "how",
  "what",
  // Incomplete modifiers / particles
  "full",
  "more",
  "less",
  "such",
  "very",
  "too",
  "slow",
  // Adverbs & particles that cannot end a sentence
  "already",
  "just",
  "still",
  "also",
  "even",
  "always",
  "never",
  "really",
  "quite",
  "almost",
  "nearly",
  "as",
  "not",
  "only",
  "then",
]);

// Coordinating and subordinating conjunctions suitable for thought-group breaks
const CLAUSE_SPLIT_CONJUNCTIONS = new Set([
  "and",
  "but",
  "because",
  "although",
  "though",
  "so",
  "when",
  "while",
  "where",
  "however",
  "therefore",
  "if",
  "unless",
  "since",
  "whereas",
]);

// Coordinating conjunctions that connect dependent phrases
const COORDINATING_CONJUNCTIONS = new Set([
  "and",
  "or",
  "but",
  "so",
  "yet",
  "nor",
]);

/**
 * Normalizes raw text from YouTube captions
 */
export function cleanSegmentText(text: string): string {
  return text
    .replace(/\[(?:Applause|Music|Laughter|Cheering|Silence|Audio)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a string ends with terminal punctuation (excluding abbreviations)
 */
export function hasTerminalPunctuation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!/[.?!]$|[.?!]["')\]]+$/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/);
  const lastWord = words[words.length - 1]?.toLowerCase().replace(/[^\w.]/g, "") || "";
  if (ABBREVIATIONS.has(lastWord)) return false;

  // Single letter with dot, e.g. "a." or "j." (initials)
  if (/^[a-z]\.$/i.test(lastWord)) return false;

  // Decimal numbers like "3.14"
  if (/^\d+\.\d+$/.test(lastWord)) return false;

  return true;
}

/**
 * Checks if text begins with a capitalized character (potential sentence start)
 */
export function startsWithCapital(text: string): boolean {
  const trimmed = text.trim().replace(/^[>"\s-]+/, "");
  return /^[A-Z]/.test(trimmed);
}

/**
 * Checks if text begins with a speaker turn indicator (>> or --)
 */
export function isSpeakerTurn(text: string): boolean {
  return /^>>|^-{2,}/.test(text.trim());
}

/**
 * Checks if text ends with a dangling grammatical word (preposition, article, conjunction)
 */
export function endsInDanglingSyntax(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (hasTerminalPunctuation(trimmed)) return false;

  const words = trimmed.split(/\s+/);
  const lastWord = words[words.length - 1]?.toLowerCase().replace(/[^\w]/g, "") || "";
  return DANGLING_END_WORDS.has(lastWord);
}

/**
 * Checks if a short text is a legitimate standalone interjection
 */
export function isLegitInterjection(text: string): boolean {
  const clean = text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  return STANDALONE_SHORT_INTERJECTIONS.has(clean);
}

/**
 * Inserts thought group markers ( / ) into a sentence for natural pause guidance
 */
export function generateThoughtGroups(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 6) return text.trim();

  const chunks: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    current.push(w);

    const endsWithComma = /[,;:]$/.test(w);
    const nextWord = words[i + 1]?.toLowerCase().replace(/[^\w]/g, "");

    // Break after commas or before coordinating conjunctions if current chunk has >= 3 words
    const shouldBreakAfterComma = endsWithComma && current.length >= 3;
    const shouldBreakBeforeConjunction =
      nextWord && CLAUSE_SPLIT_CONJUNCTIONS.has(nextWord) && current.length >= 4 && words.length - i >= 3;

    if (shouldBreakAfterComma || shouldBreakBeforeConjunction) {
      chunks.push(current.join(" "));
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks.join(" / ");
}

/**
 * Multi-Pass Fragment & Orphan Healing Engine
 * Merges orphan words (1-2 words), dangling syntax, and lowercase continuation fragments
 * into their preceding sentences so that every segment is a grammatically complete thought group.
 */
export function mergeFragmentedSegments<
  T extends {
    segment_id?: string;
    text: string;
    start_time: number;
    end_time: number;
    translationVi?: string;
    thoughtGroups?: string;
    ipa?: string;
    wordsWithIpa?: WordIpaToken[];
    rawChunkCount?: number;
  }
>(segments: T[], options: StitcherOptions = {}): T[] {
  if (!Array.isArray(segments) || segments.length <= 1) return segments || [];

  const maxAllowedWords = options.maxWordCount || 26;
  const merged: T[] = [];

  for (let i = 0; i < segments.length; i++) {
    const curr = { ...segments[i] };
    if (merged.length === 0) {
      merged.push(curr);
      continue;
    }

    const prev = merged[merged.length - 1];
    const prevTrimmed = prev.text.trim();
    const currTrimmed = curr.text.trim();

    const currWords = currTrimmed.split(/\s+/).filter(Boolean);
    const prevWords = prevTrimmed.split(/\s+/).filter(Boolean);
    const prevHasTerminal = hasTerminalPunctuation(prevTrimmed);
    const currStartsNewSpeaker = isSpeakerTurn(currTrimmed);
    const currStartsCapital = startsWithCapital(currTrimmed);
    const currIsInterjection = isLegitInterjection(currTrimmed);
    const prevIsDangling = endsInDanglingSyntax(prevTrimmed);

    const silenceGap = Math.max(0, curr.start_time - prev.end_time);
    const firstWordClean = currWords[0]?.toLowerCase().replace(/[^\w]/g, "") || "";
    const isCoordinatingConj = COORDINATING_CONJUNCTIONS.has(firstWordClean);

    // Rule 1: Never merge across an explicit speaker turn (>>)
    if (currStartsNewSpeaker) {
      merged.push(curr);
      continue;
    }

    // Rule 2: Extremely short orphan fragments (<= 2 words, like "middle." or "and use.")
    // ALWAYS merge into previous unless it is a legitimate standalone interjection
    const isOrphanFragment = currWords.length <= 2 && !currIsInterjection;

    // Rule 3: Prev ended in dangling syntax (e.g. "somewhere in the", "answer in a full", "slow")
    // A sentence CANNOT end on an article, preposition, conjunction, or dangling modifier!
    const isDanglingSyntaxContinuation = prevIsDangling;

    // Rule 4a: Prev had NO terminal punctuation, curr is short (<= 3 words) and not capitalized
    const isShortContinuation = !prevHasTerminal && currWords.length <= 3 && !currStartsCapital;

    // Rule 4b: Prev had NO terminal punctuation, curr starts with a coordinating conjunction ("and", "or", etc.)
    // forming an unfinished compound thought (within max word count)
    const isConjunctionContinuation =
      !prevHasTerminal &&
      isCoordinatingConj &&
      prevWords.length + currWords.length <= maxAllowedWords;

    // Rule 4c: Prev had NO terminal punctuation, curr is not capitalized and there is NO acoustic pause between chunks
    const isSeamlessContinuation =
      !prevHasTerminal &&
      !currStartsCapital &&
      silenceGap < 0.35 &&
      prevWords.length + currWords.length <= maxAllowedWords;

    const shouldMerge =
      isOrphanFragment ||
      isDanglingSyntaxContinuation ||
      isShortContinuation ||
      isConjunctionContinuation ||
      isSeamlessContinuation;

    if (shouldMerge) {
      // Weld curr into prev seamlessly
      let weldedText = `${prevTrimmed} ${currTrimmed}`;

      // If prev already ended in terminal punctuation (. ? !) and curr is an interrupted trailing word (<= 2 words)
      // right before a new speaker turn (>>), append ellipsis (...) so the learner recognizes an interrupted thought trail.
      const nextSeg = segments[i + 1];
      const isNextSpeakerTurn = nextSeg && isSpeakerTurn(nextSeg.text);
      if (
        prevHasTerminal &&
        currWords.length <= 2 &&
        isNextSpeakerTurn &&
        !currTrimmed.endsWith("...")
      ) {
        weldedText = `${prevTrimmed} ${currTrimmed}...`;
      }

      prev.text = weldedText;
      prev.end_time = Math.max(prev.end_time, curr.end_time);

      if (curr.translationVi && prev.translationVi) {
        prev.translationVi = `${prev.translationVi.trim()} ${curr.translationVi.trim()}`;
      } else if (curr.translationVi && !prev.translationVi) {
        prev.translationVi = curr.translationVi;
      }

      // Recompute IPA and thought groups across the unified sentence
      prev.wordsWithIpa = getSentenceWordsWithIpa(prev.text);
      prev.ipa = prev.wordsWithIpa.map((w) => w.ipa).filter(Boolean).join(" ");
      prev.thoughtGroups = generateThoughtGroups(prev.text);

      if (prev.rawChunkCount !== undefined) {
        prev.rawChunkCount = (prev.rawChunkCount || 1) + (curr.rawChunkCount || 1);
      }
    } else {
      merged.push(curr);
    }
  }

  // Final Pass: Re-index segment IDs and ensure strictly non-decreasing contiguous timestamps
  for (let i = 0; i < merged.length; i++) {
    merged[i].segment_id = `seg_${String(i + 1).padStart(3, "0")}`;
    if (i > 0) {
      if (merged[i].start_time < merged[i - 1].start_time) {
        merged[i].start_time = merged[i - 1].end_time;
      }
      if (merged[i].end_time <= merged[i].start_time) {
        merged[i].end_time = Math.round((merged[i].start_time + 1.5) * 10) / 10;
      }
    }
  }

  // Clamping Pass: Prevent segments from overlapping into subsequent speaker turns or sentences
  // and preserve a natural acoustic breathing margin (0.08s) between contiguous sentences
  for (let i = 0; i < merged.length - 1; i++) {
    if (merged[i].end_time > merged[i + 1].start_time) {
      const naturalEnd = Math.round((merged[i + 1].start_time - 0.08) * 100) / 100;
      merged[i].end_time = Math.max(
        Math.round((merged[i].start_time + 0.3) * 10) / 10,
        naturalEnd
      );
    }
  }

  return merged;
}

interface WordToken {
  text: string;
  start_time: number;
  end_time: number;
  silenceGapBefore: number;
  isSpeakerTurnStart: boolean;
  rawChunkIndex: number;
}

function extractWordTokens(
  rawSegments: Array<{ text: string; start_time: number; end_time: number }>
): WordToken[] {
  const tokens: WordToken[] = [];

  for (let cIdx = 0; cIdx < rawSegments.length; cIdx++) {
    const chunk = rawSegments[cIdx];
    const cleanedText = cleanSegmentText(chunk.text);
    if (!cleanedText) continue;

    const words = cleanedText.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const chunkDuration = Math.max(0.1, chunk.end_time - chunk.start_time);
    const prevChunk = cIdx > 0 ? rawSegments[cIdx - 1] : null;
    const silenceGapBefore = prevChunk
      ? Math.max(0, chunk.start_time - prevChunk.end_time)
      : 0;

    // Weight word duration by character count for higher alignment precision
    const weights = words.map((w) => Math.max(1, w.replace(/[^\w]/g, "").length));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let accumulatedWeight = 0;
    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      const weight = weights[wIdx];

      const wordStart =
        chunk.start_time + (accumulatedWeight / totalWeight) * chunkDuration;
      const wordEnd =
        chunk.start_time + ((accumulatedWeight + weight) / totalWeight) * chunkDuration;

      tokens.push({
        text: word,
        start_time: Math.round(wordStart * 100) / 100,
        end_time: Math.round(wordEnd * 100) / 100,
        silenceGapBefore: wIdx === 0 ? silenceGapBefore : 0,
        isSpeakerTurnStart: wIdx === 0 && isSpeakerTurn(word),
        rawChunkIndex: cIdx,
      });

      accumulatedWeight += weight;
    }
  }

  return tokens;
}

/**
 * High-End Transcript Stitching Algorithm
 * Uses Token-Level Stream Re-alignment and Sentence Boundary Disambiguation (SBD)
 * to re-align fragmented YouTube captions into grammatically and acoustically complete
 * sentences with contiguous timestamps.
 */
export function stitchTranscriptSegments(
  rawSegments: Array<{ text: string; start_time: number; end_time: number }>,
  options: StitcherOptions = {}
): StitchedSentenceSegment[] {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) return [];

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const validRaw = rawSegments
    .map((s) => ({
      text: cleanSegmentText(s.text),
      start_time: Math.max(0, s.start_time),
      end_time: Math.max(s.start_time + 0.1, s.end_time),
    }))
    .filter((s) => s.text.length > 0);

  if (validRaw.length === 0) return [];

  const tokens = extractWordTokens(validRaw);
  if (tokens.length === 0) return [];

  const stitched: StitchedSentenceSegment[] = [];
  let currentGroup: WordToken[] = [];

  const commitGroup = () => {
    if (currentGroup.length === 0) return;

    const combinedText = currentGroup.map((c) => c.text).join(" ").trim();
    if (combinedText.length === 0) {
      currentGroup = [];
      return;
    }

    const rawStartTime = currentGroup[0].start_time;
    const rawEndTime = currentGroup[currentGroup.length - 1].end_time;
    const startTime = Math.round(rawStartTime * 10) / 10;
    const endTime = Math.round(rawEndTime * 10) / 10;

    const wordsWithIpa = getSentenceWordsWithIpa(combinedText);
    const sentenceIpa = wordsWithIpa.map((w) => w.ipa).filter(Boolean).join(" ");
    const thoughtGroups = generateThoughtGroups(combinedText);
    const uniqueRawChunks = new Set(currentGroup.map((t) => t.rawChunkIndex));

    stitched.push({
      segment_id: `seg_${String(stitched.length + 1).padStart(3, "0")}`,
      text: combinedText,
      start_time: startTime,
      end_time: Math.max(startTime + 0.5, endTime),
      wordsWithIpa,
      ipa: sentenceIpa,
      thoughtGroups,
      rawChunkCount: uniqueRawChunks.size,
    });

    currentGroup = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prevToken = currentGroup[currentGroup.length - 1];

    if (prevToken) {
      const currentDuration = prevToken.end_time - currentGroup[0].start_time;
      const currentWords = currentGroup.length;

      const tokenWordClean = token.text.toLowerCase().replace(/[^\w]/g, "");
      const isCoordinatingConj = COORDINATING_CONJUNCTIONS.has(tokenWordClean);
      const prevHasTerminal = hasTerminalPunctuation(prevToken.text);

      // ── Boundary Decision Matrix (Before pushing token) ──
      // Factor 1: Explicit Speaker Turn boundary (>> or --)
      const isNewSpeaker = token.isSpeakerTurnStart;

      // Factor 2: Acoustic silence pause between chunks (> silencePauseThreshold)
      // Guard: Do NOT split on acoustic pause before coordinating conjunctions ("and", "or", etc.)
      // when previous token has NO terminal punctuation
      const hasAcousticPause =
        token.silenceGapBefore >= opts.silencePauseThreshold &&
        currentWords >= opts.minWordCount &&
        !endsInDanglingSyntax(prevToken.text) &&
        (prevHasTerminal || !isCoordinatingConj || currentWords >= opts.maxWordCount);

      // Factor 3: Clause boundary split when buffer is excessively long
      const isClauseBoundary =
        (currentWords >= opts.maxWordCount || currentDuration >= opts.maxSegmentDuration) &&
        currentWords >= 12 &&
        CLAUSE_SPLIT_CONJUNCTIONS.has(tokenWordClean) &&
        !endsInDanglingSyntax(prevToken.text);

      if (isNewSpeaker || hasAcousticPause || isClauseBoundary) {
        commitGroup();
      }
    }

    currentGroup.push(token);

    // ── Boundary Decision Matrix (After pushing token) ──
    // Factor 4: Terminal punctuation (. ? !)
    if (hasTerminalPunctuation(token.text)) {
      const nextToken = tokens[i + 1];

      // If currentGroup has only 1 word and is followed by more words within the same raw chunk,
      // let it stay with the subsequent words (e.g. "Yeah. Not just ...") to prevent micro-orphans
      const isIntroductoryWordInSameChunk =
        currentGroup.length === 1 &&
        nextToken &&
        nextToken.rawChunkIndex === token.rawChunkIndex &&
        !nextToken.isSpeakerTurnStart;

      if (!isIntroductoryWordInSameChunk) {
        commitGroup();
      }
    }
  }

  // Commit remaining buffer
  commitGroup();

  // Pass 4 & 5: Run the Multi-Pass Fragment & Orphan Healing Engine
  return mergeFragmentedSegments(stitched, opts);
}
