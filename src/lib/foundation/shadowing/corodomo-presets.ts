import type { WordIpaToken } from "./ipa-dictionary";

export interface CorodomoSegment {
  segment_id: string;
  text: string;
  start_time: number;
  end_time: number;
  translationVi?: string;
  thoughtGroups?: string;
  ipa?: string;
  wordsWithIpa?: WordIpaToken[];
}

export interface CorodomoVideoLesson {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | string;
  playlistName: string;
  playlistId: string;
  thumbnail: string;
  duration: string;
  publishedAt?: string;
  publishedText?: string;
  segments: CorodomoSegment[];
}

/**
 * Default presets list (initialized empty - no mock/seed data).
 * Users learn with genuine videos by pasting real YouTube URLs.
 */
export const CORODOMO_VIDEO_PRESETS: CorodomoVideoLesson[] = [];

/**
 * Extracts clean 11-char YouTube ID from URL or bare string
 */
export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle various URL formats
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && v.length === 11) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "v"].includes(parts[0]) && parts[1]) {
        return parts[1].slice(0, 11);
      }
    }
    if (parsed.hostname.includes("youtu.be")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0].slice(0, 11);
    }
  } catch {}

  // Regex fallback
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}
