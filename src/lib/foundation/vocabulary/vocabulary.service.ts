// Hybrid Spoken Vocabulary Service — Function 8
// Fast In-Memory 10k+ Lexicon DB (<1ms) + On-Demand AI Spoken Lexicographer (Cách 2)

import { generateTextWithRouting } from "@/lib/ai";
import { spokenWordItemSchema } from "@/lib/validation/vocabulary-context-schemas";
import { DICTIONARY_ENRICHMENT_SYSTEM } from "@/lib/ai/prompts/vocabulary-context-prompts";
import {
  lookupLexiconWord,
  getRandomLexiconWord,
  synthesizeSpokenWordItem,
} from "./lexicon-db.service";
import type { SpokenWordItem } from "@/types/vocabulary-context";

export { INITIAL_DEFAULT_WORD } from "./default-word";

function cleanJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const m = withoutFence.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

/**
 * Fetch public phonetics from Free Dictionary API
 */
async function fetchFreeDictionaryApi(word: string): Promise<{
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
} | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(3000),
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
 * Search word with Hybrid Strategy:
 * 1. Fast in-memory 10k database lookup (<1ms) if !forceAI
 * 2. On-demand AI Deep Enrichment (Cách 2) if word not in DB or forceAI === true
 */
export async function searchSpokenDictionary(
  queryWord: string,
  options: { forceAI?: boolean; provider?: string; model?: string } = {}
): Promise<SpokenWordItem> {
  const cleanWord = queryWord.trim().toLowerCase();
  const provider = options.provider || "gemini";
  const model = options.model || "auto";

  // 1. Instant Local 10k DB Lookup if not forcing AI
  if (!options.forceAI) {
    const localHit = lookupLexiconWord(cleanWord);
    if (localHit) return localHit;
  }

  // Mock provider handling for unit tests
  if (provider === "mock") {
    const localHit = lookupLexiconWord(cleanWord);
    if (localHit) return localHit;

    return {
      id: `word_${cleanWord}`,
      word: cleanWord,
      ipaUS: `/${cleanWord}/`,
      partOfSpeech: "noun",
      cefrLevel: "B1",
      meaningVi: `Ý nghĩa của từ "${cleanWord}"`,
      englishDefinition: `Definition of ${cleanWord}`,
      stressedSyllableIndex: 1,
      stressExplanationVi: `Trọng âm rơi vào âm tiết đầu của từ "${cleanWord}"`,
      endingSoundGuideVi: "Bật âm cuối rõ ràng và tự nhiên",
      collocations: [
        {
          phrase: `use ${cleanWord}`,
          meaningVi: `sử dụng ${cleanWord}`,
          exampleSentence: `You can use ${cleanWord} in spoken English.`,
          collocationType: "verb_noun",
          pmiStrength: "high",
        },
      ],
      contextSentences: [
        {
          id: "s1",
          domain: "workplace",
          domainTitleVi: "Công việc (Workplace)",
          sentenceEn: `We need to focus on this ${cleanWord} today.`,
          sentenceVi: `Chúng ta cần tập trung vào việc này hôm nay.`,
          targetWordHighlighted: cleanWord,
          linkingSoundHints: "focus on -> focus-on",
        },
      ],
      spontaneousChallenge: {
        promptEn: `In a spoken conversation, reply in 1-2 sentences using "${cleanWord}".`,
        promptVi: `Trong một cuộc hội thoại, hãy tự nói 1-2 câu ứng biến có chứa từ "${cleanWord}".`,
        targetCollocation: `use ${cleanWord}`,
        suggestedOpeningEn: `When discussing this, I believe...`,
      },
      wordMasteryScore: 0,
      sentenceMasteryScore: 0,
      isMastered: false,
      practiceCount: 0,
    };
  }

  // 2. On-Demand AI Spoken Lexicographer Deep Enrichment (Cách 2)
  const dictApiData = await fetchFreeDictionaryApi(cleanWord);

  const prompt = `Provide detailed pronunciation, IPA, Vietnamese definition, collocations, and context sentences for the English word: "${cleanWord}".
${dictApiData?.phonetic ? `Verified phonetic IPA: ${dictApiData.phonetic}` : ""}
${dictApiData?.definition ? `Standard definition: ${dictApiData.definition}` : ""}
Return strict JSON matching the schema.`;

  let lastErrorMsg = "";
  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: DICTIONARY_ENRICHMENT_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 800,
      },
    });

    const parsed = cleanJson(res.text) as Record<string, unknown>;
    if (!parsed) throw new Error("Could not parse JSON");
    if (!parsed.id) parsed.id = `word_${cleanWord}_${Date.now()}`;
    if (!parsed.word) parsed.word = cleanWord;
    if (!parsed.spontaneousChallenge) {
      parsed.spontaneousChallenge = {
        promptEn: `Speak 1-2 spontaneous sentences using "${cleanWord}".`,
        promptVi: `Tự nói 1-2 câu phản xạ có chứa từ "${cleanWord}".`,
        targetCollocation: `use ${cleanWord}`,
      };
    }

    const validated = spokenWordItemSchema.safeParse(parsed);
    if (!validated.success) throw new Error(`Schema validation error: ${validated.error.message.slice(0, 100)}`);
    return validated.data as SpokenWordItem;
  } catch (err: any) {
    lastErrorMsg = err?.message || String(err);
    const fallbackLocal = lookupLexiconWord(cleanWord);
    if (fallbackLocal) return fallbackLocal;

    throw new Error(
      `Không thể tra cứu chuyên sâu từ "${cleanWord}" từ AI: ${lastErrorMsg}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }
}

/**
 * Random Word Sampling:
 * - Default: <1ms instant sampling from 10k database with strict CEFR filtering
 * - If forceAI: generates dynamic novel word via AI
 */
export async function generateDynamicRandomWord(options: {
  cefrLevel?: string;
  forceAI?: boolean;
  provider?: string;
  model?: string;
} = {}): Promise<SpokenWordItem> {
  if (!options.forceAI) {
    return getRandomLexiconWord({ cefrLevel: options.cefrLevel });
  }

  const provider = options.provider || "gemini";
  const model = options.model || "auto";
  const level = options.cefrLevel || "B1";

  if (provider === "mock") {
    return getRandomLexiconWord({ cefrLevel: level });
  }

  const prompt = `Pick a high-value, practical spoken English vocabulary word suitable for CEFR ${level}.
Generate complete phonetic IPA, Vietnamese definition, stress guide, 2 collocations, and 2 context sentences.
Return strict JSON matching the schema.`;

  let lastErrorMsg = "";
  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: DICTIONARY_ENRICHMENT_SYSTEM,
        temperature: 0.8,
        maxOutputTokens: 800,
      },
    });

    const parsed = cleanJson(res.text) as Record<string, unknown>;
    if (parsed) {
      if (!parsed.id) parsed.id = `word_ai_${Date.now()}`;
      const validated = spokenWordItemSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data as SpokenWordItem;
      } else {
        lastErrorMsg = `Schema validation error: ${validated.error.message.slice(0, 100)}`;
      }
    } else {
      lastErrorMsg = "AI không trả về JSON hợp lệ";
    }
  } catch (err: any) {
    lastErrorMsg = err?.message || String(err);
  }

  throw new Error(
    `Không thể tạo ngẫu nhiên từ mới từ AI: ${lastErrorMsg || "Lỗi không xác định"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
  );
}
