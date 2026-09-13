// Orthographic Syllable Chunker — Function 8 (Spoken Vocabulary Studio)
// Splits English words into natural syllable chunks for contextual TTS synthesis with word boundaries.

/**
 * Splits an English word into readable orthographic syllables matching target count.
 * Uses natural phonetic vowel nuclei and consonant cluster boundaries.
 */
export function getOrthographicSyllables(word: string, syllableCount: number): string[] {
  if (!word || syllableCount <= 1) return [word || ""];

  const lower = word.toLowerCase().trim();

  // Find vowel nuclei groups
  const vowels = /[aeiouy]+/gi;
  const matches: { index: number; length: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = vowels.exec(lower)) !== null) {
    // Treat trailing silent 'e' as non-syllabic if we have more vowel groups than target
    if (m.index === lower.length - 1 && lower[m.index] === "e" && matches.length >= syllableCount) {
      continue;
    }
    matches.push({ index: m.index, length: m[0].length });
  }

  // If number of vowel clusters matches syllableCount
  if (matches.length === syllableCount) {
    const cuts: number[] = [0];
    for (let i = 0; i < matches.length - 1; i++) {
      const vEnd = matches[i].index + matches[i].length;
      const nextVStart = matches[i + 1].index;
      const consCount = nextVStart - vEnd;
      if (consCount <= 1) {
        cuts.push(vEnd);
      } else {
        cuts.push(vEnd + Math.floor(consCount / 2));
      }
    }
    cuts.push(word.length);

    const result: string[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      result.push(word.slice(cuts[i], cuts[i + 1]));
    }
    return result;
  }

  // Fallback: distribute letters proportionally
  const avg = word.length / syllableCount;
  const result: string[] = [];
  for (let i = 0; i < syllableCount; i++) {
    const start = Math.round(i * avg);
    const end = i === syllableCount - 1 ? word.length : Math.round((i + 1) * avg);
    result.push(word.slice(start, end));
  }
  return result;
}
