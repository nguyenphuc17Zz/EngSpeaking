import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { getOrthographicSyllables } from "@/lib/foundation/vocabulary/syllable-chunker";
import { logger } from "@/lib/logger";

export interface SyllableBoundaryInfo {
  index: number;
  text: string;
  startSec: number;
  endSec: number;
}

export interface SyllablesAudioResponse {
  word: string;
  audioBase64: string;
  boundaries: SyllableBoundaryInfo[];
  totalDurationSec: number;
}

// In-memory cache: cacheKey -> SyllablesAudioResponse (bounded to 200 entries)
const MAX_SYLLABLES_CACHE_SIZE = 200;
const cache = new Map<string, SyllablesAudioResponse>();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const word = url.searchParams.get("word")?.trim();
  const countParam = url.searchParams.get("count");
  const count = countParam !== null ? parseInt(countParam, 10) : 1;
  const voice = url.searchParams.get("voice") || "en-US-JennyNeural";
  const speedParam = url.searchParams.get("speed");
  const speed = speedParam !== null ? parseFloat(speedParam) : 1.0;

  if (!word) {
    return NextResponse.json({ error: "Missing word parameter" }, { status: 400 });
  }
  if (word.length > 60) {
    return NextResponse.json({ error: "Word parameter exceeds maximum length of 60 characters" }, { status: 400 });
  }
  if (!Number.isFinite(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "Invalid count parameter (must be between 1 and 10)" }, { status: 400 });
  }
  if (!Number.isFinite(speed) || speed < 0.5 || speed > 2.0) {
    return NextResponse.json({ error: "Invalid speed parameter (must be between 0.5 and 2.0)" }, { status: 400 });
  }

  const cacheKey = `${word.toLowerCase()}_${count}_${voice}_${speed}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const syllables = getOrthographicSyllables(word, count);
  // Join with comma to trigger distinct syllable pauses with contextual phonetics
  const phrase = syllables.join(", ");

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });

    const pct = Math.round((speed - 1) * 100);
    const rateParam = pct === 0 ? undefined : pct > 0 ? `+${pct}%` : `${pct}%`;
    const { audioStream, metadataStream } = tts.toStream(phrase, rateParam ? { rate: rateParam } : undefined);

    const audioChunks: Buffer[] = [];
    const rawBoundaries: { text: string; offsetSec: number; durationSec: number }[] = [];

    audioStream.on("data", (chunk: Buffer) => {
      audioChunks.push(chunk);
    });

    if (metadataStream) {
      metadataStream.on("data", (chunk: Buffer) => {
        try {
          const parsed = JSON.parse(chunk.toString());
          if (Array.isArray(parsed.Metadata)) {
            for (const item of parsed.Metadata) {
              if (item.Type === "WordBoundary" && item.Data) {
                const text = item.Data.text?.Text || "";
                // 1 tick = 100 nanoseconds = 10^-7 seconds
                const offsetSec = (item.Data.Offset || 0) / 10_000_000;
                const durationSec = (item.Data.Duration || 0) / 10_000_000;
                rawBoundaries.push({ text, offsetSec, durationSec });
              }
            }
          }
        } catch {
          // Ignore JSON parse errors in partial stream chunks
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      audioStream.on("end", () => resolve());
      audioStream.on("error", (e) => reject(e));
    });

    const audioBuffer = Buffer.concat(audioChunks);
    const audioBase64 = `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;

    // Map raw WordBoundary events to syllables
    const boundaries: SyllableBoundaryInfo[] = [];
    let prevEnd = 0;

    for (let i = 0; i < syllables.length; i++) {
      const sylText = syllables[i];
      const match = rawBoundaries[i];

      if (match) {
        const startSec = Math.max(prevEnd, match.offsetSec);
        const endSec = startSec + match.durationSec;
        boundaries.push({
          index: i,
          text: sylText,
          startSec: parseFloat(startSec.toFixed(3)),
          endSec: parseFloat(endSec.toFixed(3)),
        });
        prevEnd = endSec;
      } else {
        // Fallback: approximate if metadata missed an item
        const estDuration = 0.4;
        const startSec = prevEnd + 0.1;
        const endSec = startSec + estDuration;
        boundaries.push({
          index: i,
          text: sylText,
          startSec: parseFloat(startSec.toFixed(3)),
          endSec: parseFloat(endSec.toFixed(3)),
        });
        prevEnd = endSec;
      }
    }

    const totalDurationSec = boundaries.length > 0 ? boundaries[boundaries.length - 1].endSec + 0.1 : 1.5;

    const responseData: SyllablesAudioResponse = {
      word,
      audioBase64,
      boundaries,
      totalDurationSec: parseFloat(totalDurationSec.toFixed(3)),
    };

    if (cache.has(cacheKey)) {
      cache.delete(cacheKey);
    } else if (cache.size >= MAX_SYLLABLES_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, responseData);
    return NextResponse.json(responseData);
  } catch (err: unknown) {
    logger.error({
      action: "speak_syllables_error",
      word,
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: "Failed to synthesize syllable audio", detail: String(err) },
      { status: 500 }
    );
  } finally {
    try {
      tts.close();
    } catch {}
  }
}
