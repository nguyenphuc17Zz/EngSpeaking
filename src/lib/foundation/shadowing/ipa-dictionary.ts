// IPA Dictionary & Converter for English Words in Shadowing
// Provides word-by-word International Phonetic Alphabet (IPA) transcriptions from authentic dictionary data

import { lookupLexiconWord } from "@/lib/foundation/vocabulary/lexicon-db.service";
import CORE_IPA_DATA from "./data/core-ipa.json";

export interface WordIpaToken {
  word: string;
  cleanWord: string;
  ipa: string;
  isPunctuation?: boolean;
}

// 40,000+ words Core IPA Map (Oxford 5000 + open-dict-data General American & RP)
export const COMMON_IPA_MAP: Record<string, string> = CORE_IPA_DATA as Record<string, string>;

/**
 * Derive IPA from base lemma if the exact inflected form is missing
 */
function deriveLemmatizedIpa(clean: string): string | null {
  const dict = COMMON_IPA_MAP;

  // 1. Possessive 's
  if (clean.endsWith("'s")) {
    const base = clean.slice(0, -2);
    if (dict[base]) return dict[base] + "z";
  }

  // 2. Plural -ies (e.g., categories -> category)
  if (clean.endsWith("ies")) {
    const base = clean.slice(0, -3) + "y";
    if (dict[base]) return dict[base].replace(/i$/g, "") + "iz";
  }

  // 3. Plural -es (e.g., watches -> watch)
  if (clean.endsWith("es")) {
    const base = clean.slice(0, -2);
    if (dict[base]) return dict[base] + "ɪz";
  }

  // 4. Regular plural -s (e.g., books -> book)
  if (clean.endsWith("s") && !clean.endsWith("ss")) {
    const base = clean.slice(0, -1);
    if (dict[base]) {
      const lastChar = dict[base].slice(-1);
      const isVoiceless = ["p", "t", "k", "f", "θ"].includes(lastChar);
      return dict[base] + (isVoiceless ? "s" : "z");
    }
  }

  // 5. Participle -ing (e.g., playing -> play, running -> run, dancing -> dance)
  if (clean.endsWith("ing")) {
    let base = clean.slice(0, -3);
    if (dict[base]) return dict[base] + "ɪŋ";
    // Double consonant: running -> run
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      const singleBase = base.slice(0, -1);
      if (dict[singleBase]) return dict[singleBase] + "ɪŋ";
    }
    // Dropped 'e': dancing -> dance
    const eBase = base + "e";
    if (dict[eBase]) return dict[eBase] + "ɪŋ";
  }

  // 6. Past -ed (e.g., played -> play, watched -> watch, started -> start)
  if (clean.endsWith("ed")) {
    let base = clean.slice(0, -2);
    if (dict[base]) return dict[base] + "d";
    const eBase = clean.slice(0, -1);
    if (dict[eBase]) return dict[eBase] + "d";
    // Double consonant: stopped -> stop
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      const singleBase = base.slice(0, -1);
      if (dict[singleBase]) return dict[singleBase] + "t";
    }
  }

  // 7. Adverb -ly (e.g., quickly -> quick)
  if (clean.endsWith("ly")) {
    const base = clean.slice(0, -2);
    if (dict[base]) return dict[base] + "li";
    if (clean.endsWith("ily")) {
      const yBase = clean.slice(0, -3) + "y";
      if (dict[yBase]) return dict[yBase] + "li";
    }
  }

  // 8. Comparative / Superlative -er / -est
  if (clean.endsWith("er")) {
    const base = clean.slice(0, -2);
    if (dict[base]) return dict[base] + "ər";
  }
  if (clean.endsWith("est")) {
    const base = clean.slice(0, -3);
    if (dict[base]) return dict[base] + "ɪst";
  }

  return null;
}

/**
 * Clean a word token and look up its IPA from authentic dictionaries
 */
export function getWordIpa(rawWord: string): string {
  const clean = rawWord.toLowerCase().replace(/[^\w']/g, "");
  if (!clean) return "";

  // 1. Check in-memory 40k+ dictionary
  if (COMMON_IPA_MAP[clean]) {
    return COMMON_IPA_MAP[clean];
  }

  // Handle common contractions without apostrophe
  const cleanNoApos = clean.replace(/'/g, "");
  if (COMMON_IPA_MAP[cleanNoApos]) {
    return COMMON_IPA_MAP[cleanNoApos];
  }

  // 2. Check local CEFR Lexicon Database (Oxford 5000)
  const match = lookupLexiconWord(clean) || lookupLexiconWord(cleanNoApos);
  if (match?.ipaUS) {
    return match.ipaUS.replace(/^\/|\/$/g, "");
  }
  if (match?.ipaUK) {
    return match.ipaUK.replace(/^\/|\/$/g, "");
  }

  // 3. Fallback: Morphological derivation from base root dictionary word
  const lemmatized = deriveLemmatizedIpa(clean);
  if (lemmatized) {
    return lemmatized;
  }

  return "";
}

/**
 * Split sentence into tokens with IPA for each word
 */
export function getSentenceWordsWithIpa(sentence: string): WordIpaToken[] {
  if (!sentence) return [];

  // Match words with apostrophes or punctuation tokens
  const rawTokens = sentence.split(/(\s+)/);

  const result: WordIpaToken[] = [];

  for (const token of rawTokens) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      continue; // skip pure whitespace
    }

    const clean = token.toLowerCase().replace(/[^\w']/g, "");
    if (!clean) {
      result.push({
        word: token,
        cleanWord: token,
        ipa: "",
        isPunctuation: true,
      });
      continue;
    }

    const ipa = getWordIpa(clean);
    result.push({
      word: token,
      cleanWord: clean,
      ipa,
      isPunctuation: false,
    });
  }

  return result;
}
