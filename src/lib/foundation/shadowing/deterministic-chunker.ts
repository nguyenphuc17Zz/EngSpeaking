import type { YouTubeTranscriptSegment, LinguisticAnalysisResult, SegmentEnhancement } from "@/types/shadowing";

// Common English function words (usually unstressed in spoken English)
const FUNCTION_WORDS = new Set([
  "a", "an", "the",
  "in", "on", "at", "to", "for", "with", "by", "of", "from", "about", "into", "through", "after", "over", "between",
  "and", "but", "or", "so", "for", "yet", "nor",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
  "this", "that", "these", "those",
  "as", "if", "than", "that", "whether"
]);

// Clause connectors that naturally introduce thought group boundaries
const CLAUSE_CONNECTORS = new Set([
  "because", "although", "even though", "while", "whereas",
  "since", "unless", "whenever", "wherever", "provided that",
  "which", "who", "whom", "whose", "where", "when", "why", "how"
]);

/**
 * Break a sentence into natural spoken Thought Groups (Sense Groups)
 * marked with '/' for minor breath pauses and '//' for clause boundaries.
 */
export function buildThoughtGroups(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Split sentence by commas, semicolons, dashes first
  const parts = trimmed.split(/([,;—–-]+)/);
  const chunks: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (/^[,;—–-]+$/.test(part)) {
      if (chunks.length > 0) {
        chunks[chunks.length - 1] += part;
      }
      continue;
    }

    // Split words in this part
    const words = part.split(/\s+/);
    if (words.length <= 4) {
      chunks.push(part);
      continue;
    }

    // Break longer phrases at natural grammatical boundaries (connectors / prepositions)
    let currentChunk: string[] = [];
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const lower = word.toLowerCase().replace(/[^a-z]/g, "");

      const isConnector = CLAUSE_CONNECTORS.has(lower);
      const isPreposition = ["in", "on", "at", "to", "for", "with", "by", "of", "about"].includes(lower);

      if (currentChunk.length >= 3 && (isConnector || (isPreposition && currentChunk.length >= 4))) {
        chunks.push(currentChunk.join(" "));
        currentChunk = [word];
      } else {
        currentChunk.push(word);
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
    }
  }

  return chunks.join(" / ");
}

/**
 * Extract content words that carry sentence stress (nouns, verbs, adjectives, adverbs)
 */
export function extractStressWords(text: string): string[] {
  const words = text.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, "").trim());
  const stressWords: string[] = [];

  for (const w of words) {
    if (!w || w.length <= 2) continue;
    const lower = w.toLowerCase();
    if (!FUNCTION_WORDS.has(lower)) {
      stressWords.push(w);
    }
  }

  return Array.from(new Set(stressWords));
}

/**
 * Generate 100% deterministic, instant linguistic enhancement for all transcript segments.
 * Runs in < 1 millisecond with zero API calls.
 */
export function generateDeterministicEnhancement(
  segments: YouTubeTranscriptSegment[]
): LinguisticAnalysisResult {
  const enhancements: SegmentEnhancement[] = segments.map((seg) => {
    const thoughtGroups = buildThoughtGroups(seg.text);
    const stressWords = extractStressWords(seg.text);

    return {
      segment_id: seg.segment_id,
      thought_groups_text: thoughtGroups,
      ipa_transcription: "", // pure clean acoustic reference from native audio
      stress_words: stressWords,
    };
  });

  return {
    segments_enhancement: enhancements,
    vocabulary: [],
    connected_speech_highlights: [],
    natural_expressions: [],
  };
}
