import OXFORD_5000_ENTRIES from "./data/oxford-5000.json";
import type { SpokenWordItem } from "@/types/vocabulary-context";

export interface RawLexiconEntry {
  w: string; // word
  p: string; // pos
  l: "A1" | "A2" | "B1" | "B2" | "C1"; // cefr
  i: string; // ipa
  m: string; // meaning vi
  s: number; // stress index (1-based)
  c?: string[]; // collocations
  a?: string; // audio url
}

// Map indexed by lowercase word
const wordMap = new Map<string, RawLexiconEntry>();
const allEntries: RawLexiconEntry[] = [];
const levelBuckets: Record<string, RawLexiconEntry[]> = {
  A1: [],
  A2: [],
  B1: [],
  B2: [],
  C1: [],
};

// Initialize indexes from full Oxford 5000 dataset (4,958 entries, 0ms instant lookup)
for (const item of OXFORD_5000_ENTRIES) {
  const lower = item.w.toLowerCase();
  if (!wordMap.has(lower)) {
    const level = (["A1", "A2", "B1", "B2", "C1"].includes(item.l) ? item.l : "B1") as
      | "A1"
      | "A2"
      | "B1"
      | "B2"
      | "C1";
    const raw: RawLexiconEntry = {
      w: item.w,
      p: item.p || "word",
      l: level,
      i: item.i || `/${item.w}/`,
      m: item.m || item.w,
      s: typeof item.s === "number" ? item.s : 1,
      c: [`use ${item.w}`, `practice ${item.w}`],
    };
    wordMap.set(lower, raw);
    allEntries.push(raw);
    if (levelBuckets[level]) {
      levelBuckets[level].push(raw);
    }
  }
}

function generateRealisticSentences(raw: RawLexiconEntry): {
  s1En: string;
  s1Vi: string;
  s2En: string;
  s2Vi: string;
  link1: string;
  link2: string;
} {
  const col1 = raw.c?.[0] || raw.w;
  const col2 = raw.c?.[1] || raw.w;

  // Natural Dynamic Templates based on Part of Speech & Syntax
  if (raw.p === "verb") {
    return {
      s1En: `To improve workplace productivity, our team always aims to ${col1}.`,
      s1Vi: `Để nâng cao năng suất làm việc, nhóm chúng tôi luôn hướng tới việc ${raw.m}.`,
      s2En: `You should actively ${col2} whenever you spot a good opportunity.`,
      s2Vi: `Bạn nên chủ động ${raw.m} bất cứ khi nào bạn nhận thấy một cơ hội tốt.`,
      link1: `aims to -> aymz-tuh`,
      link2: `whenever you -> when-eh-ver-yoo`,
    };
  }

  if (raw.p === "adj") {
    return {
      s1En: `Adopting this new approach proved to be exceptionally ${raw.w} for our project.`,
      s1Vi: `Áp dụng cách tiếp cận mới này đã chứng tỏ là đặc biệt ${raw.m} cho dự án của chúng tôi.`,
      s2En: `It is essential to stay ${raw.w} and focused when communicating with international clients.`,
      s2Vi: `Điều cần thiết là giữ sự ${raw.m} và tập trung khi giao tiếp với các khách hàng quốc tế.`,
      link1: `proved to -> proovd-tuh`,
      link2: `essential to -> eh-sen-shul-tuh`,
    };
  }

  // Nouns / Prepositions / Adverbs
  const isVerbCollocation = /^(take|make|have|do|get|set|give|reach|build|face|meet|seize|drive)\b/i.test(col1);

  if (isVerbCollocation) {
    return {
      s1En: `In order to succeed in modern business, you should always ${col1}.`,
      s1Vi: `Để thành công trong kinh doanh hiện đại, bạn nên luôn ${raw.m}.`,
      s2En: `Our director encouraged all team members to ${col2} before final evaluation.`,
      s2Vi: `Giám đốc của chúng tôi đã khuyến khích tất cả thành viên trong nhóm ${raw.m} trước đợt đánh giá cuối cùng.`,
      link1: `order to -> or-der-tuh`,
      link2: `encouraged all -> en-ker-ijd-awl`,
    };
  }

  return {
    s1En: `In modern professional settings, having a solid grasp of ${col1} makes a measurable impact.`,
    s1Vi: `Trong môi trường chuyên nghiệp hiện đại, việc nắm vững ${raw.m} tạo ra tác động rõ rệt.`,
    s2En: `The team spent considerable time discussing ${col2} during the strategy review.`,
    s2Vi: `Nhóm đã dành nhiều thời gian thảo luận về ${raw.m} trong buổi đánh giá chiến lược.`,
    link1: `grasp of -> grasp-uv`,
    link2: `spent considerable -> spent-kuhn-sid-er-uh-buhl`,
  };
}

export function synthesizeSpokenWordItem(raw: RawLexiconEntry): SpokenWordItem {
  const collocations = (raw.c || []).map((col, idx) => {
    let exampleSentence = `In professional discussions, using "${col}" helps articulate ideas clearly.`;
    if (/^(take|make|have|do|get|set|give|reach|build|face|meet|seize|drive)\b/i.test(col)) {
      exampleSentence = `You should always ${col} whenever the right opportunity arises.`;
    } else if (/^[a-z]+ly\b/i.test(col)) {
      exampleSentence = `Our team decided to ${col} to ensure optimal outcomes.`;
    } else {
      exampleSentence = `Developing a strong ${col} is crucial for long-term career growth.`;
    }

    return {
      phrase: col,
      meaningVi: `cụm từ "${col}"`,
      exampleSentence,
      collocationType: (idx === 0 ? "verb_noun" : "adj_noun") as "verb_noun" | "adj_noun",
      pmiStrength: "high" as const,
    };
  });

  if (collocations.length === 0) {
    collocations.push({
      phrase: `use ${raw.w}`,
      meaningVi: `sử dụng ${raw.w}`,
      exampleSentence: `You can use "${raw.w}" naturally in your daily spoken English.`,
      collocationType: "verb_noun",
      pmiStrength: "high",
    });
  }

  const stressName =
    raw.s === 1 ? "nhất" : raw.s === 2 ? "thứ hai" : raw.s === 3 ? "thứ ba" : "thứ tư";

  const s = generateRealisticSentences(raw);
  const primaryCollocation = collocations[0]?.phrase || raw.w;

  return {
    id: `lex_${raw.w}`,
    word: raw.w,
    ipaUS: raw.i,
    ipaUK: raw.i,
    partOfSpeech: raw.p,
    cefrLevel: raw.l,
    meaningVi: raw.m,
    englishDefinition: `The English word "${raw.w}" (${raw.p}) expressing: ${raw.m}.`,
    stressedSyllableIndex: raw.s,
    stressExplanationVi: `Trọng âm rơi vào âm tiết ${stressName} của từ "${raw.w}".`,
    endingSoundGuideVi: "Bật âm cuối rõ ràng và dứt khoát, không nuốt âm khi nói.",
    collocations,
    contextSentences: [
      {
        id: `s1_${raw.w}`,
        domain: "workplace",
        domainTitleVi: "Ví dụ 1: Công việc & Giao tiếp (Workplace)",
        sentenceEn: s.s1En,
        sentenceVi: s.s1Vi,
        targetWordHighlighted: raw.w,
        linkingSoundHints: s.link1,
      },
      {
        id: `s2_${raw.w}`,
        domain: "daily_life",
        domainTitleVi: "Ví dụ 2: Đời sống & Thảo luận (Daily Life)",
        sentenceEn: s.s2En,
        sentenceVi: s.s2Vi,
        targetWordHighlighted: raw.w,
        linkingSoundHints: s.link2,
      },
    ],
    spontaneousChallenge: {
      promptEn: `In a spoken conversation about your daily work or life, speak 1-2 spontaneous sentences using "${raw.w}".`,
      promptVi: `Trong một cuộc trò chuyện hàng ngày, hãy tự nói 1-2 câu phản xạ có chứa từ "${raw.w}".`,
      targetCollocation: primaryCollocation,
      suggestedOpeningEn: `Honestly, when dealing with this, I prefer to...`,
    },
    wordMasteryScore: 0,
    sentenceMasteryScore: 0,
    isMastered: false,
    practiceCount: 0,
  };
}

/**
 * Fast lookup from 10k database (<1ms)
 */
export function lookupLexiconWord(word: string): SpokenWordItem | null {
  const clean = word.trim().toLowerCase();
  const raw = wordMap.get(clean);
  if (!raw) return null;
  return synthesizeSpokenWordItem(raw);
}

/**
 * Clean and format raw dictionary definitions into concise, punchy Vietnamese meanings
 * Takes the top 1-2 prominent meanings and removes verbose parenthetical annotations.
 */
export function formatConciseMeaning(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();

  // Strip complex leading parentheticals like ((viết tắt) của ...) or ((thường) ...)
  text = text.replace(/^\(\([^)]*\)[^)]*\)\s*,?\s*/g, "");
  text = text.replace(/^\(\([^)]*\)\)\s*,?\s*/g, "");

  // Strip repeated leading domain tags like (từ Mỹ, nghĩa Mỹ), (thông tục)
  while (/^\([^)]*\)\s*,?\s*/.test(text)) {
    text = text.replace(/^\([^)]*\)\s*,?\s*/, "");
  }

  // Split by semicolons
  const parts = text.split(/[;；]/).map((p) => p.trim()).filter(Boolean);
  const selected: string[] = [];
  for (let part of parts) {
    // Strip leading domain tags in each part like (y học), (quân sự), (kỹ thuật)
    while (/^\([^)]*\)\s*,?\s*/.test(part)) {
      part = part.replace(/^\([^)]*\)\s*,?\s*/, "");
    }
    part = part.trim();
    if (part && !selected.includes(part)) {
      selected.push(part);
    }
    if (selected.length >= 2) break;
  }
  const result = selected.join("; ") || text;
  if (!result) return "";
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Standardize parts of speech to user-friendly Vietnamese & international labels
 * E.g., 'tính từ' -> 'Tính từ (adj)', 'danh từ' -> 'Danh từ (noun)', etc.
 */
export function formatPartOfSpeech(pos: string): string {
  if (!pos) return "Từ vựng";
  const p = pos.toLowerCase().trim();
  if (p.includes("tính từ") || p === "adjective" || p === "adj") return "Tính từ (adj)";
  if (p.includes("danh từ") || p === "noun") return "Danh từ (noun)";
  if (p.includes("động từ") || p === "verb") return "Động từ (verb)";
  if (p.includes("phó từ") || p.includes("trạng từ") || p === "adverb" || p === "adv") return "Trạng từ (adv)";
  if (p.includes("giới từ") || p === "preposition" || p === "prep") return "Giới từ (prep)";
  if (p.includes("liên từ") || p === "conjunction" || p === "conj") return "Liên từ (conj)";
  if (p.includes("thán từ") || p === "interjection" || p.includes("khuấy thán từ")) return "Thán từ (interj)";
  if (p === "word" || p === "từ") return "Từ vựng";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/**
 * Asynchronously fetch word definition and standardized part of speech from the offline 103k dictionary
 */
export async function fetchDictionaryDefinition(word: string): Promise<{
  found: boolean;
  meaningVi: string;
  partOfSpeech: string;
  ipa?: string;
  baseWord?: string;
} | null> {
  const clean = word.trim().toLowerCase().replace(/[^\w']/g, "");
  if (!clean) return null;

  try {
    if (typeof window !== "undefined") {
      const res = await fetch(`/api/foundation/vocabulary/dict-lookup?word=${encodeURIComponent(clean)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          return {
            found: true,
            meaningVi: data.meaningVi || "",
            partOfSpeech: data.partOfSpeech || "Từ vựng",
            ipa: data.ipa,
            baseWord: data.baseWord,
          };
        }
      }
    }
  } catch (err) {
    console.error("fetchDictionaryDefinition error:", err);
  }
  return null;
}

/**
 * Fast random selection by CEFR Level & Part of Speech (<1ms)
 */
export function getRandomLexiconWord(options: {
  cefrLevel?: string;
  partOfSpeech?: string;
  currentWordId?: string;
} = {}): SpokenWordItem {
  let pool = allEntries;

  // 1. Filter by CEFR Level if specified and not "all"
  if (options.cefrLevel && options.cefrLevel !== "all") {
    const levelKey = options.cefrLevel.toUpperCase();
    if (levelBuckets[levelKey]?.length > 0) {
      pool = levelBuckets[levelKey];
    }
  }

  // 2. Filter by Part of Speech if specified and not "all"
  if (options.partOfSpeech && options.partOfSpeech !== "all") {
    const posQuery = options.partOfSpeech.toLowerCase();
    const posFiltered = pool.filter((item) => {
      const p = item.p?.toLowerCase() || "";
      if (posQuery === "verb") return (p.startsWith("verb") || /\bverb\b/.test(p)) && !p.includes("adverb");
      if (posQuery === "noun") return p.startsWith("noun") || /\bnoun\b/.test(p);
      if (posQuery === "adjective" || posQuery === "adj") return p.startsWith("adj") || p.includes("adjective");
      if (posQuery === "adverb" || posQuery === "adv") return p.startsWith("adv") || p.includes("adverb");
      return p === posQuery;
    });
    if (posFiltered.length > 0) {
      pool = posFiltered;
    }
  }

  const cleanCurrent = options.currentWordId?.replace("lex_", "")?.replace("word_", "");
  const candidates = pool.filter((item) => item.w !== cleanCurrent);
  const finalPool = candidates.length > 0 ? candidates : pool;

  const randomIndex = Math.floor(Math.random() * finalPool.length);
  return synthesizeSpokenWordItem(finalPool[randomIndex]);
}

/**
 * Quick statistics of the Oxford 5000 core database
 */
export function getLexiconStats(): {
  total: number;
  byLevel: Record<string, number>;
  byPos: Record<string, number>;
} {
  const byLevel: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
  const byPos: Record<string, number> = { noun: 0, verb: 0, adjective: 0, adverb: 0 };

  for (const item of allEntries) {
    if (byLevel[item.l] !== undefined) byLevel[item.l]++;
    const p = item.p.toLowerCase();
    if (p.includes("adverb")) byPos.adverb++;
    else if (p.includes("verb")) byPos.verb++;
    else if (p.includes("noun")) byPos.noun++;
    else if (p.includes("adj")) byPos.adjective++;
  }

  return {
    total: allEntries.length,
    byLevel,
    byPos,
  };
}

/**
 * Fast prefix auto-complete search (<1ms)
 */
export function searchLexiconPrefix(prefix: string, limit = 8): SpokenWordItem[] {
  const clean = prefix.trim().toLowerCase();
  if (!clean) return [];

  const results: SpokenWordItem[] = [];
  for (const [w, raw] of wordMap.entries()) {
    if (w.startsWith(clean)) {
      results.push(synthesizeSpokenWordItem(raw));
      if (results.length >= limit) break;
    }
  }
  return results;
}

/**
 * Free Dictionary API lookup (~80-150ms)
 */
export async function fetchFreeDictionaryData(word: string): Promise<{
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
} | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const phonetic = entry.phonetic || entry.phonetics?.find((p: { text?: string }) => p.text)?.text;
    const firstMeaning = entry.meanings?.[0];
    const partOfSpeech = firstMeaning?.partOfSpeech;
    const definition = firstMeaning?.definitions?.[0]?.definition;

    return { phonetic, partOfSpeech, definition };
  } catch {
    return null;
  }
}

/**
 * 3-Tier Instant Word Resolver:
 * - Tier 1: Local Oxford 5000 Core Lexicon (4,958 entries, 0ms instant)
 * - Tier 2: Local 103k English-Vietnamese Dictionary (~2-5ms)
 * - Tier 3: Free Dictionary API & Instant Heuristic Fallback
 */
export async function resolveWordFast(word: string): Promise<SpokenWordItem> {
  const clean = word.trim().toLowerCase();

  // 1. Tier 1: Local Oxford 5000 Lexicon (0ms)
  const localHit = lookupLexiconWord(clean);
  if (localHit) return localHit;

  // 2. Tier 2: Local English-Vietnamese 103k Dictionary
  let dictMeaning = "";
  let dictPos = "noun";
  let dictIpa = `/${clean}/`;

  try {
    if (typeof window !== "undefined") {
      const res = await fetch(`/api/foundation/vocabulary/dict-lookup?word=${encodeURIComponent(clean)}`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          dictMeaning = data.meaningVi;
          dictPos = data.partOfSpeech || "noun";
          dictIpa = data.ipa || dictIpa;
        }
      }
    }
  } catch {
    // Ignore network or parse errors for fallback
  }

  // 3. Tier 3: Free Dictionary API fallback if meaning is not found
  if (!dictMeaning) {
    const dictData = await fetchFreeDictionaryData(clean);
    if (dictData) {
      dictIpa = dictData.phonetic || dictIpa;
      dictPos = (dictData.partOfSpeech as any) || dictPos;
      dictMeaning = dictData.definition || "";
    }
  }

  const finalMeaning = dictMeaning || `Từ tiếng Anh: ${clean}`;

  // 4. Synthesize instant SpokenWordItem immediately
  return {
    id: `word_${clean}`,
    word: clean,
    ipaUS: dictIpa,
    partOfSpeech: dictPos as any,
    cefrLevel: "B1",
    meaningVi: finalMeaning,
    englishDefinition: `The English term "${clean}" (${dictPos}): ${finalMeaning}`,
    stressedSyllableIndex: 1,
    stressExplanationVi: `Trọng âm của từ "${clean}"`,
    endingSoundGuideVi: "Bật âm cuối rõ ràng và tự nhiên",
    collocations: [
      {
        phrase: `use ${clean}`,
        meaningVi: `sử dụng ${clean}`,
        exampleSentence: `You can use "${clean}" in spoken English.`,
        collocationType: "verb_noun",
        pmiStrength: "high",
      },
    ],
    contextSentences: [
      {
        id: "s1",
        domain: "daily_life",
        domainTitleVi: "Đời sống hàng ngày",
        sentenceEn: `Let's practice pronouncing "${clean}" clearly.`,
        sentenceVi: `Hãy cùng luyện phát âm từ "${clean}" một cách tự nhiên nhé.`,
        targetWordHighlighted: clean,
      },
    ],
    spontaneousChallenge: {
      promptEn: `Use "${clean}" in a short spoken sentence.`,
      promptVi: `Nói một câu ngắn có chứa từ "${clean}".`,
      targetCollocation: clean,
      suggestedOpeningEn: `When I use ${clean}, I...`,
    },
    wordMasteryScore: 0,
    sentenceMasteryScore: 0,
    isMastered: false,
    practiceCount: 0,
  };
}
