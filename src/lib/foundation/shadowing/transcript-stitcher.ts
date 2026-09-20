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
  maxSegmentDuration: 8.0,
  minWordCount: 4,
  maxWordCount: 20,
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
>(segments: T[]): T[] {
  if (!Array.isArray(segments) || segments.length <= 1) return segments || [];

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
    const prevHasTerminal = hasTerminalPunctuation(prevTrimmed);
    const currStartsNewSpeaker = isSpeakerTurn(currTrimmed);
    const currStartsCapital = startsWithCapital(currTrimmed);
    const currIsInterjection = isLegitInterjection(currTrimmed);
    const prevIsDangling = endsInDanglingSyntax(prevTrimmed);

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

    // Rule 4: Prev had NO terminal punctuation, curr is short (<= 3 words) and not capitalized
    const isShortContinuation = !prevHasTerminal && currWords.length <= 3 && !currStartsCapital;

    const shouldMerge = isOrphanFragment || isDanglingSyntaxContinuation || isShortContinuation;

    if (shouldMerge) {
      // Weld curr into prev seamlessly
      prev.text = `${prevTrimmed} ${currTrimmed}`;
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

  return merged;
}

/**
 * High-End Transcript Stitching Algorithm
 * Takes raw, fragmented YouTube subtitle chunks and merges them into grammatically
 * and acoustically complete sentences with non-overlapping, contiguous timestamps.
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

  const stitched: StitchedSentenceSegment[] = [];
  let currentGroup: typeof validRaw = [];

  const commitGroup = () => {
    if (currentGroup.length === 0) return;

    const combinedText = currentGroup.map((c) => c.text).join(" ").trim();
    if (combinedText.length === 0) {
      currentGroup = [];
      return;
    }

    const startTime = Math.round(currentGroup[0].start_time * 10) / 10;
    const endTime = Math.round(currentGroup[currentGroup.length - 1].end_time * 10) / 10;
    const wordsWithIpa = getSentenceWordsWithIpa(combinedText);
    const sentenceIpa = wordsWithIpa.map((w) => w.ipa).filter(Boolean).join(" ");
    const thoughtGroups = generateThoughtGroups(combinedText);

    stitched.push({
      segment_id: `seg_${String(stitched.length + 1).padStart(3, "0")}`,
      text: combinedText,
      start_time: startTime,
      end_time: Math.max(startTime + 0.5, endTime),
      wordsWithIpa,
      ipa: sentenceIpa,
      thoughtGroups,
      rawChunkCount: currentGroup.length,
    });

    currentGroup = [];
  };

  for (let i = 0; i < validRaw.length; i++) {
    const chunk = validRaw[i];
    const prevChunk = currentGroup[currentGroup.length - 1];

    if (!prevChunk) {
      currentGroup.push(chunk);
      continue;
    }

    // Measure acoustic silence gap between chunks
    const silenceGap = Math.max(0, chunk.start_time - prevChunk.end_time);
    const currentText = currentGroup.map((c) => c.text).join(" ");
    const currentWords = currentText.split(/\s+/).length;
    const currentDuration = prevChunk.end_time - currentGroup[0].start_time;

    // ── Boundary Decision Matrix ─────────────────────────────────────────
    // Factor 1: Speaker Turn boundary (>> or --)
    const isNewSpeaker = isSpeakerTurn(chunk.text);

    // Factor 2: Strong terminal punctuation in the current buffer (. ? !)
    const hasTerminal = hasTerminalPunctuation(prevChunk.text);

    // Factor 3: Acoustic silence pause (speaker paused for > 550ms)
    const hasAcousticPause = silenceGap >= opts.silencePauseThreshold && currentWords >= opts.minWordCount;

    // Factor 4: Next chunk starts with a capital letter AND current has adequate words/duration
    const nextIsNewSentence =
      startsWithCapital(chunk.text) &&
      (currentWords >= opts.minWordCount || currentDuration >= opts.minSegmentDuration);

    // Factor 5: Buffer exceeded maximum comfortable shadowing duration (> 8s or > 20 words)
    // CRITICAL: NEVER break on buffer length if the current text ends in dangling syntax (e.g. "in the", "a", "and")
    const isBufferTooLong =
      (currentDuration >= opts.maxSegmentDuration || currentWords >= opts.maxWordCount) &&
      !endsInDanglingSyntax(prevChunk.text);

    // Factor 6: Forced break on clause boundary when buffer is moderately long
    const isClauseBoundary =
      currentWords >= 10 &&
      CLAUSE_SPLIT_CONJUNCTIONS.has(chunk.text.split(/\s+/)[0]?.toLowerCase().replace(/[^\w]/g, ""));

    if (
      isNewSpeaker ||
      hasTerminal ||
      hasAcousticPause ||
      (nextIsNewSentence && (hasTerminal || silenceGap > 0.3)) ||
      isBufferTooLong ||
      isClauseBoundary
    ) {
      commitGroup();
    }

    currentGroup.push(chunk);
  }

  // Commit remaining buffer
  commitGroup();

  // Pass 4 & 5: Run the Multi-Pass Fragment & Orphan Healing Engine
  return mergeFragmentedSegments(stitched);
}
