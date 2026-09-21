import { NextRequest, NextResponse } from "next/server";
import type { YouTubeTranscriptSegment } from "@/types/shadowing";
import { getSentenceWordsWithIpa } from "@/lib/foundation/shadowing/ipa-dictionary";
import { stitchTranscriptSegments } from "@/lib/foundation/shadowing/transcript-stitcher";

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CLIENT_VERSION = "20.10.38";
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "v"].includes(pathParts[0]) && pathParts[1]) {
        return pathParts[1].slice(0, 11);
      }
    }
    if (parsed.hostname.includes("youtu.be")) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      return pathParts[0] ? pathParts[0].slice(0, 11) : null;
    }
  } catch {}

  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses XML transcript supporting both srv3 format (<p t="ms" d="ms">)
 * with word-level millisecond precision (<s t="offsetMs">)
 * and classic format (<text start="s" dur="s">)
 */
export function parseTranscriptXml(xml: string): YouTubeTranscriptSegment[] {
  const segments: YouTubeTranscriptSegment[] = [];

  // 1. Try srv3 format (<p t="ms" d="ms">...)
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;
  let index = 1;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(pMatch[1], 10);
    const durMs = pMatch[2] ? parseInt(pMatch[2], 10) : 3500;
    const rawContent = pMatch[3];

    // Check if word/phrase level timestamps <s t="..."> exist
    const sRegex = /<s(?:\s+t="(\d+)")?[^>]*>([^<]*)<\/s>/gi;
    let sMatch: RegExpExecArray | null;
    const sSpans: Array<{ offsetMs: number; text: string }> = [];

    while ((sMatch = sRegex.exec(rawContent)) !== null) {
      const offsetMs = sMatch[1] ? parseInt(sMatch[1], 10) : 0;
      const text = decodeHtmlEntities(sMatch[2]);
      if (text.trim() && !/^\[.*?\]$/.test(text.trim())) {
        sSpans.push({ offsetMs, text });
      }
    }

    if (sSpans.length > 0) {
      for (let i = 0; i < sSpans.length; i++) {
        const curr = sSpans[i];
        const next = sSpans[i + 1];
        const segStartMs = startMs + curr.offsetMs;
        // For the last word in <p>, avoid stretching across seconds of trailing silence or next speech
        const maxTrailingWordDurMs = Math.min(
          Math.max(100, durMs - curr.offsetMs),
          Math.max(450, curr.text.length * 90)
        );
        const segEndMs = next
          ? startMs + next.offsetMs
          : startMs + curr.offsetMs + maxTrailingWordDurMs;
        const startTime = Math.round((segStartMs / 1000) * 100) / 100;
        const endTime = Math.round((segEndMs / 1000) * 100) / 100;

        segments.push({
          segment_id: `seg_${String(index++).padStart(3, "0")}`,
          text: curr.text,
          start_time: startTime,
          end_time: Math.max(startTime + 0.05, endTime),
        });
      }
    } else {
      let cleanText = decodeHtmlEntities(rawContent.replace(/<[^>]+>/g, ""));
      if (cleanText && cleanText.length > 1 && !/^\[.*?\]$/.test(cleanText)) {
        const startTime = Math.round((startMs / 1000) * 10) / 10;
        const endTime = Math.round(((startMs + durMs) / 1000) * 10) / 10;
        segments.push({
          segment_id: `seg_${String(index++).padStart(3, "0")}`,
          text: cleanText,
          start_time: startTime,
          end_time: endTime,
        });
      }
    }
  }

  if (segments.length > 0) return segments;

  // 2. Fallback to classic format (<text start="s" dur="s">...)
  const textRegex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  let tMatch: RegExpExecArray | null;
  index = 1;

  while ((tMatch = textRegex.exec(xml)) !== null) {
    const start = parseFloat(tMatch[1]);
    const duration = tMatch[2] ? parseFloat(tMatch[2]) : 3.0;
    const cleanText = decodeHtmlEntities(tMatch[3]);

    if (cleanText && cleanText.length > 1 && !/^\[.*?\]$/.test(cleanText)) {
      segments.push({
        segment_id: `seg_${String(index++).padStart(3, "0")}`,
        text: cleanText,
        start_time: Math.round(start * 10) / 10,
        end_time: Math.round((start + duration) * 10) / 10,
      });
    }
  }

  return segments;
}

interface InnertubeResult {
  title?: string;
  channel?: string;
  publishedAt?: string;
  duration?: string;
  segments: YouTubeTranscriptSegment[];
}

/**
 * Robust Innertube Player API fetch
 * Also scrapes watch page in parallel to get publishDate (not available via Android Innertube)
 */
async function fetchCaptionsViaInnertube(videoId: string): Promise<InnertubeResult | null> {
  try {
    const [innertubeRes, pageRes] = await Promise.allSettled([
      fetch(INNERTUBE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": INNERTUBE_USER_AGENT,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: INNERTUBE_CLIENT_VERSION,
            },
          },
          videoId,
        }),
      }),
      // Fetch watch page in parallel for publishDate (microformat)
      fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
        },
      }),
    ]);

    if (innertubeRes.status !== "fulfilled" || !innertubeRes.value.ok) return null;
    const data = await innertubeRes.value.json();
    const videoTitle = data?.videoDetails?.title;
    const channelName = data?.videoDetails?.author;
    const lengthSeconds = parseInt(data?.videoDetails?.lengthSeconds || "0", 10);
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return null;

    // Prioritize English tracks
    const manualEnTrack = captionTracks.find(
      (t: { languageCode?: string; kind?: string }) =>
        (t.languageCode === "en" || t.languageCode?.startsWith("en")) && t.kind !== "asr"
    );

    const autoEnTrack = captionTracks.find(
      (t: { languageCode?: string }) => t.languageCode === "en" || t.languageCode?.startsWith("en")
    );

    const selectedTrack = manualEnTrack || autoEnTrack || captionTracks[0];
    if (!selectedTrack || !selectedTrack.baseUrl) return null;

    const xmlRes = await fetch(selectedTrack.baseUrl, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
      },
    });

    if (!xmlRes.ok) return null;
    const xml = await xmlRes.text();
    if (!xml || xml.trim().length === 0) return null;

    const segments = parseTranscriptXml(xml);
    if (segments.length === 0) return null;

    // Extract publishDate from watch page HTML (Innertube Android doesn't return microformat)
    let publishDate: string | undefined;
    if (pageRes.status === "fulfilled" && pageRes.value.ok) {
      const html = await pageRes.value.text();
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerMatch?.[1]) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          publishDate =
            playerData?.microformat?.playerMicroformatRenderer?.publishDate ||
            playerData?.microformat?.playerMicroformatRenderer?.uploadDate;
        } catch {
          // ignore
        }
      }
    }

    return {
      title: videoTitle,
      channel: channelName,
      publishedAt: publishDate,
      duration: formatDurationSeconds(lengthSeconds),
      segments,
    };
  } catch {
    return null;
  }
}


/**
 * Web Page Scraping fallback for captionTracks
 */
async function fetchCaptionsViaWebPage(videoId: string): Promise<InnertubeResult | null> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(videoUrl, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!match || !match[1]) return null;

    const data = JSON.parse(match[1]);
    const videoTitle = data?.videoDetails?.title;
    const channelName = data?.videoDetails?.author;
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return null;

    const manualEnTrack = captionTracks.find(
      (t: { languageCode?: string; kind?: string }) =>
        (t.languageCode === "en" || t.languageCode?.startsWith("en")) && t.kind !== "asr"
    );

    const autoEnTrack = captionTracks.find(
      (t: { languageCode?: string }) => t.languageCode === "en" || t.languageCode?.startsWith("en")
    );

    const selectedTrack = manualEnTrack || autoEnTrack || captionTracks[0];
    if (!selectedTrack || !selectedTrack.baseUrl) return null;

    const xmlRes = await fetch(selectedTrack.baseUrl, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
      },
    });

    if (!xmlRes.ok) return null;
    const xml = await xmlRes.text();
    if (!xml || xml.trim().length === 0) return null;

    const segments = parseTranscriptXml(xml);
    if (segments.length === 0) return null;

    const publishDate =
      data?.microformat?.playerMicroformatRenderer?.publishDate ||
      data?.microformat?.playerMicroformatRenderer?.uploadDate;

    const lengthSeconds = parseInt(data?.videoDetails?.lengthSeconds || "0", 10);

    return {
      title: videoTitle,
      channel: channelName,
      publishedAt: publishDate,
      duration: formatDurationSeconds(lengthSeconds),
      segments,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, videoId: rawVideoId, customScript } = body;

    const videoId = extractYouTubeId(url || rawVideoId || "");

    // 1. If user provided a Custom Script / Manual Transcript
    if (customScript && typeof customScript === "string" && customScript.trim().length > 0) {
      const sentences = customScript
        .split(/(?<=[.?!])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2);

      if (sentences.length === 0) {
        return NextResponse.json(
          { error: "Văn bản bài nói (Custom Script) không chứa câu hợp lệ." },
          { status: 400 }
        );
      }

      let currentTime = 0;
      const customSegments = sentences.map((text, i) => {
        const estDuration = Math.max(2.5, Math.round((text.split(/\s+/).length / 2.5) * 10) / 10);
        const wordsWithIpa = getSentenceWordsWithIpa(text);
        const seg = {
          segment_id: `seg_${String(i + 1).padStart(3, "0")}`,
          text,
          start_time: Math.round(currentTime * 10) / 10,
          end_time: Math.round((currentTime + estDuration) * 10) / 10,
          wordsWithIpa,
          ipa: wordsWithIpa.map((w) => w.ipa).filter(Boolean).join(" "),
          thoughtGroups: text,
        };
        currentTime += estDuration + 0.5;
        return seg;
      });

      return NextResponse.json({
        success: true,
        videoId: videoId || "custom_video",
        title: videoId ? `YouTube (${videoId}) - Custom Script` : "Custom Transcript Practice",
        channel: "Custom Script",
        thumbnail: videoId
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
        segments: customSegments,
        totalSegments: customSegments.length,
        isCustomScript: true,
      });
    }

    // 2. Automated Transcript Extraction from YouTube
    if (!videoId) {
      return NextResponse.json(
        { error: "Đường dẫn YouTube không hợp lệ. Vui lòng nhập link video hoặc ID video 11 ký tự." },
        { status: 400 }
      );
    }

    // Step 1: Try Innertube Android Client (most reliable)
    let result = await fetchCaptionsViaInnertube(videoId);

    // Step 2: Fallback to Web Page extraction
    if (!result || result.segments.length === 0) {
      result = await fetchCaptionsViaWebPage(videoId);
    }

    if (result && result.segments.length > 0) {
      // Apply High-End Sentence Alignment & Boundary Stitching Algorithm
      const stitchedSegments = stitchTranscriptSegments(result.segments);

      return NextResponse.json({
        success: true,
        videoId,
        title: result.title || `YouTube Video (${videoId})`,
        channel: result.channel || "YouTube",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: result.publishedAt,
        duration: result.duration,
        segments: stitchedSegments,
        totalSegments: stitchedSegments.length,
      });
    }

    // Authentic 404 response with clear guidance
    return NextResponse.json(
      {
        error:
          "Video này không có phụ đề tiếng Anh (Closed Captions) công khai trên YouTube. Bạn có thể bấm '✍️ Dán bài nói (Custom Script)' để tự dán nội dung và luyện tập ngay với video này.",
        canUseCustomScript: true,
      },
      { status: 404 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Lỗi kết nối YouTube: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}

/**
 * Format seconds into mm:ss or hh:mm:ss string
 */
function formatDurationSeconds(totalSec: number): string {
  if (!totalSec || totalSec <= 0) return "";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/**
 * GET /api/shadowing/youtube-transcript?videoId=xxx
 * Returns lightweight metadata (publishedAt, duration, title, channel) without downloading the full transcript.
 * Used for background sync to backfill missing metadata on existing library items.
 *
 * Strategy:
 * - publishDate: scraped from watch page HTML (ytInitialPlayerResponse.microformat) - Innertube Android doesn't return this
 * - lengthSeconds/title/channel: from Innertube Android (fast & reliable)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId || videoId.length !== 11) {
    return NextResponse.json({
      success: true,
      engine: "youtube-innertube-v20.10.38",
    });
  }

  try {
    // Run both fetches in parallel
    const [innertubeRes, pageRes] = await Promise.allSettled([
      // 1. Innertube Android for duration, title, channel
      fetch(INNERTUBE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": INNERTUBE_USER_AGENT,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: INNERTUBE_CLIENT_VERSION,
            },
          },
          videoId,
        }),
      }),
      // 2. Web page scrape for publishDate (microformat only available via HTML)
      fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
        },
      }),
    ]);

    let lengthSeconds = 0;
    let title: string | null = null;
    let channel: string | null = null;
    let publishDate: string | null = null;

    // Extract from Innertube response
    if (innertubeRes.status === "fulfilled" && innertubeRes.value.ok) {
      const data = await innertubeRes.value.json();
      lengthSeconds = parseInt(data?.videoDetails?.lengthSeconds || "0", 10);
      title = data?.videoDetails?.title || null;
      channel = data?.videoDetails?.author || null;
    }

    // Extract publishDate from watch page HTML
    if (pageRes.status === "fulfilled" && pageRes.value.ok) {
      const html = await pageRes.value.text();

      // Try ytInitialPlayerResponse first (most reliable)
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerMatch?.[1]) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          publishDate =
            playerData?.microformat?.playerMicroformatRenderer?.publishDate ||
            playerData?.microformat?.playerMicroformatRenderer?.uploadDate ||
            null;

          // Also fill in title/channel if Innertube missed them
          if (!title) title = playerData?.videoDetails?.title || null;
          if (!channel) channel = playerData?.videoDetails?.author || null;
          if (!lengthSeconds) {
            lengthSeconds = parseInt(playerData?.videoDetails?.lengthSeconds || "0", 10);
          }
        } catch {
          // ignore JSON parse error
        }
      }

      // Fallback: try ytInitialData for publishDate as dateText
      if (!publishDate) {
        const initialDataMatch = html.match(/ytInitialData\s*=\s*({.+?});\s*<\/script>/);
        if (initialDataMatch?.[1]) {
          try {
            const initialData = JSON.parse(initialDataMatch[1]);
            // dateText is in "Ngày 12 tháng 3 năm 2022" or "Mar 12, 2022" format
            const dateText =
              initialData?.contents?.twoColumnWatchNextResults?.results?.results
                ?.contents?.[0]?.videoPrimaryInfoRenderer?.dateText?.simpleText;
            if (dateText) {
              const parsed = new Date(dateText);
              if (!isNaN(parsed.getTime())) {
                publishDate = parsed.toISOString();
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      videoId,
      publishedAt: publishDate,
      duration: formatDurationSeconds(lengthSeconds),
      title,
      channel,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "Metadata fetch error: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

