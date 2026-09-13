import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word")?.trim().toLowerCase();

  if (!word) {
    return NextResponse.json({ success: false, error: "Missing word parameter" }, { status: 400 });
  }

  const firstChar = word[0]?.toLowerCase() || "other";
  const letterData = getLetterData(firstChar);

  if (letterData && letterData[word]) {
    const [meaning, pos, ipa] = letterData[word];
    return NextResponse.json({
      success: true,
      found: true,
      word,
      meaningVi: meaning,
      partOfSpeech: pos || "word",
      ipa: ipa || `/${word}/`,
    });
  }

  return NextResponse.json({
    success: true,
    found: false,
    word,
  });
}
