import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { formatConciseMeaning, formatPartOfSpeech } from "@/lib/foundation/vocabulary/lexicon-db.service";
import { getWordIpa } from "@/lib/foundation/shadowing/ipa-dictionary";

// Cache for loaded letter buckets to avoid repeated disk reads
const letterCache = new Map<string, Record<string, [string, string, string]>>();

function getLetterData(letter: string): Record<string, [string, string, string]> | null {
  const safeChar = /^[a-z]$/.test(letter) ? letter : "other";
  if (letterCache.has(safeChar)) {
    return letterCache.get(safeChar)!;
  }

  const filePath = path.join(process.cwd(), "public", "dictionary", "en-vi", `${safeChar}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    letterCache.set(safeChar, data);
    return data;
  } catch (err) {
    console.error(`Failed to read dictionary file for letter ${safeChar}:`, err);
    return null;
  }
}

function getLemmatizationCandidates(word: string): string[] {
  const cands: string[] = [];
  if (word.endsWith("ies")) cands.push(word.slice(0, -3) + "y");
  if (word.endsWith("es")) cands.push(word.slice(0, -2));
  if (word.endsWith("s")) cands.push(word.slice(0, -1));
  if (word.endsWith("ied")) cands.push(word.slice(0, -3) + "y");
  if (word.endsWith("ed")) {
    cands.push(word.slice(0, -1));
    cands.push(word.slice(0, -2));
    if (/(.)\1ed$/.test(word)) cands.push(word.slice(0, -3));
  }
  if (word.endsWith("ing")) {
    cands.push(word.slice(0, -3));
    cands.push(word.slice(0, -3) + "e");
    if (/(.)\1ing$/.test(word)) cands.push(word.slice(0, -4));
  }
  if (word.endsWith("ier")) cands.push(word.slice(0, -3) + "y");
  if (word.endsWith("iest")) cands.push(word.slice(0, -4) + "y");
  if (word.endsWith("ly")) {
    if (word.endsWith("ily")) cands.push(word.slice(0, -3) + "y");
    cands.push(word.slice(0, -2));
  }
  return [...new Set(cands.filter((c) => c.length >= 2))];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word")?.trim().toLowerCase();

  if (!word) {
    return NextResponse.json({ success: false, error: "Missing word parameter" }, { status: 400 });
  }

  const firstChar = word[0]?.toLowerCase() || "other";
  const letterData = getLetterData(firstChar);

  let match: [string, string, string] | undefined = undefined;
  let matchedWord = word;

  if (letterData) {
    if (letterData[word]) {
      match = letterData[word];
    } else {
      // Try morphological / inflection variations
      const candidates = getLemmatizationCandidates(word);
      for (const cand of candidates) {
        const candFirstChar = cand[0]?.toLowerCase() || "other";
        const candData = candFirstChar === firstChar ? letterData : getLetterData(candFirstChar);
        if (candData && candData[cand]) {
          match = candData[cand];
          matchedWord = cand;
          break;
        }
      }
    }
  }

  if (match) {
    const [rawMeaning, rawPos, rawIpa] = match;
    const meaningVi = formatConciseMeaning(rawMeaning);
    const partOfSpeech = formatPartOfSpeech(rawPos);

    // Resolve phonetic IPA: prefer dictionary if available, else derive phonetic approximation
    let ipa = rawIpa?.trim();
    if (!ipa) {
      const computed = getWordIpa(word) || getWordIpa(matchedWord);
      ipa = computed ? `/${computed}/` : `/${word}/`;
    } else if (!ipa.startsWith("/")) {
      ipa = `/${ipa}/`;
    }

    return NextResponse.json({
      success: true,
      found: true,
      word,
      baseWord: matchedWord !== word ? matchedWord : undefined,
      meaningVi,
      rawMeaning,
      partOfSpeech,
      ipa,
    });
  }

  // If not found in 103k dictionary, still provide phonetic IPA
  const fallbackIpa = getWordIpa(word);
  return NextResponse.json({
    success: true,
    found: false,
    word,
    ipa: fallbackIpa ? `/${fallbackIpa}/` : `/${word}/`,
    partOfSpeech: "Từ vựng",
  });
}
