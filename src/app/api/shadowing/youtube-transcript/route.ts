import { NextRequest, NextResponse } from "next/server";
import type { YouTubeTranscriptSegment } from "@/types/shadowing";

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CLIENT_VERSION = "20.10.38";
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function extractYouTubeId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "shorts" || pathParts[0] === "embed" || pathParts[0] === "v") {
        return pathParts[1] || null;
      }
    }
    if (parsed.hostname.includes("youtu.be")) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      return pathParts[0] || null;
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
 * and classic format (<text start="s" dur="s">)
 */
function parseTranscriptXml(xml: string): YouTubeTranscriptSegment[] {
  const segments: YouTubeTranscriptSegment[] = [];

  // 1. Try srv3 format (<p t="ms" d="ms">...)
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;
  let index = 1;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(pMatch[1], 10);
    const durMs = pMatch[2] ? parseInt(pMatch[2], 10) : 3500;
    const rawContent = pMatch[3];

    // Extract inside <s> tags if present, or strip tags
    let cleanText = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/gi;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = sRegex.exec(rawContent)) !== null) {
      cleanText += sMatch[1];
    }
    if (!cleanText) {
      cleanText = rawContent.replace(/<[^>]+>/g, "");
    }

    cleanText = decodeHtmlEntities(cleanText);

    // Skip empty or sound effects like [Applause], [Music]
    if (cleanText && cleanText.length > 1 && !/^\[.*?\]$/.test(cleanText)) {
      const startTime = Math.round((startMs / 1000) * 10) / 10;
      const endTime = Math.round(((startMs + durMs) / 1000) * 10) / 10;
      segments.push({
        segment_id: `seg_${String(index).padStart(3, "0")}`,
        text: cleanText,
        start_time: startTime,
        end_time: endTime,
      });
      index++;
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
        segment_id: `seg_${String(index).padStart(3, "0")}`,
        text: cleanText,
        start_time: Math.round(start * 10) / 10,
        end_time: Math.round((start + duration) * 10) / 10,
      });
      index++;
    }
  }

  return segments;
}

/**
 * Robust Innertube Player API fetch
 */
async function fetchCaptionsViaInnertube(videoId: string): Promise<YouTubeTranscriptSegment[] | null> {
  try {
    const res = await fetch(INNERTUBE_API_URL, {
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
    });

    if (!res.ok) return null;
    const data = await res.json();
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return null;

    // Prioritize:
    // 1. English Manual Subtitles (creator uploaded: no 'kind' or kind !== 'asr')
    // 2. English Auto Subtitles (kind === 'asr')
    // 3. Any track starting with 'en'
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
    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  }
}

/**
 * Web Page Scraping fallback for captionTracks
 */
async function fetchCaptionsViaWebPage(videoId: string): Promise<YouTubeTranscriptSegment[] | null> {
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
    return segments.length > 0 ? segments : null;
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
      const customSegments: YouTubeTranscriptSegment[] = sentences.slice(0, 40).map((text, i) => {
        const estDuration = Math.max(2.5, Math.round((text.split(/\s+/).length / 2.5) * 10) / 10);
        const seg: YouTubeTranscriptSegment = {
          segment_id: `seg_${String(i + 1).padStart(3, "0")}`,
          text,
          start_time: Math.round(currentTime * 10) / 10,
          end_time: Math.round((currentTime + estDuration) * 10) / 10,
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
    let segments = await fetchCaptionsViaInnertube(videoId);

    // Step 2: Fallback to Web Page extraction
    if (!segments || segments.length === 0) {
      segments = await fetchCaptionsViaWebPage(videoId);
    }

    if (segments && segments.length > 0) {
      return NextResponse.json({
        success: true,
        videoId,
        title: `YouTube Video (${videoId})`,
        channel: "YouTube",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        segments: segments.slice(0, 40),
        totalSegments: segments.length,
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

export async function GET() {
  return NextResponse.json({
    success: true,
    engine: "youtube-innertube-v20.10.38",
  });
}
