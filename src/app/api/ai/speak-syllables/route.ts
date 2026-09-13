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

// In-memory cache: cacheKey -> SyllablesAudioResponse
const cache = new Map<string, SyllablesAudioResponse>();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const word = url.searchParams.get("word")?.trim();
  const countParam = url.searchParams.get("count");
  const count = countParam ? parseInt(countParam, 10) : 1;
  const voice = url.searchParams.get("voice") || "en-US-JennyNeural";
  const speedParam = url.searchParams.get("speed");
  const speed = speedParam ? parseFloat(speedParam) : 1.0;

  if (!word) {
    return NextResponse.json({ error: "Missing word parameter" }, { status: 400 });
  }

  const cacheKey = `${word.toLowerCase()}_${count}_${voice}_${speed}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const syllables = getOrthographicSyllables(word, count);
  // Join with comma to trigger distinct syllable pauses with contextual phonetics
  const phrase = syllables.join(", ");

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });

    const rateParam = speed !== 1 ? `${Math.round((speed - 1) * 100)}%` : undefined;
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
  }
}
