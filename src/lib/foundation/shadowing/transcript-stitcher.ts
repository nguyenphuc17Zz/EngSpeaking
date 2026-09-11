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
function cleanSegmentText(text: string): string {
  return text
    .replace(/\[(?:Applause|Music|Laughter|Cheering|Silence|Audio)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a string ends with terminal punctuation
 */
function hasTerminalPunctuation(text: string): boolean {
  const trimmed = text.trim();
  return /[.?!]$|[.?!]["')\]]+$/.test(trimmed);
}

/**
 * Checks if text begins with a capitalized character (potential sentence start)
 */
function startsWithCapital(text: string): boolean {
  const trimmed = text.trim();
  return /^[A-Z]/.test(trimmed);
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

    const cleanLower = w.toLowerCase().replace(/[^\w]/g, "");
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
    // Factor 1: Strong terminal punctuation in the current buffer (. ? !)
    const hasTerminal = hasTerminalPunctuation(prevChunk.text);

    // Factor 2: Acoustic silence pause (speaker paused for > 550ms)
    const hasAcousticPause = silenceGap >= opts.silencePauseThreshold && currentWords >= opts.minWordCount;

    // Factor 3: Next chunk starts with a capital letter AND current has adequate words/duration
    const nextIsNewSentence =
      startsWithCapital(chunk.text) &&
      (currentWords >= opts.minWordCount || currentDuration >= opts.minSegmentDuration);

    // Factor 4: Buffer exceeded maximum comfortable shadowing duration (> 8s or > 20 words)
    const isBufferTooLong =
      currentDuration >= opts.maxSegmentDuration || currentWords >= opts.maxWordCount;

    // Factor 5: Forced break on clause boundary when buffer is moderately long
    const isClauseBoundary =
      currentWords >= 10 &&
      CLAUSE_SPLIT_CONJUNCTIONS.has(chunk.text.split(/\s+/)[0]?.toLowerCase().replace(/[^\w]/g, ""));

    if (hasTerminal || hasAcousticPause || (nextIsNewSentence && (hasTerminal || silenceGap > 0.3)) || isBufferTooLong || isClauseBoundary) {
      commitGroup();
    }

    currentGroup.push(chunk);
  }

  // Commit remaining buffer
  commitGroup();

  // Final Pass: Ensure strictly non-decreasing contiguous timestamps
  for (let i = 0; i < stitched.length; i++) {
    if (i > 0) {
      if (stitched[i].start_time < stitched[i - 1].start_time) {
        stitched[i].start_time = stitched[i - 1].end_time;
      }
      if (stitched[i].end_time <= stitched[i].start_time) {
        stitched[i].end_time = Math.round((stitched[i].start_time + 2.0) * 10) / 10;
      }
    }
  }

  return stitched;
}
