import { NextRequest, NextResponse } from "next/server";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

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

export function translateRelativeTime(text?: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.includes("trước") || trimmed.includes("Hôm qua")) return trimmed;
  return trimmed
    .replace(/^Streamed\s+/i, "Đã phát ")
    .replace(/(\d+)\s+seconds?\s+ago/i, "$1 giây trước")
    .replace(/(\d+)\s+minutes?\s+ago/i, "$1 phút trước")
    .replace(/(\d+)\s+hours?\s+ago/i, "$1 giờ trước")
    .replace(/(\d+)\s+days?\s+ago/i, "$1 ngày trước")
    .replace(/(\d+)\s+weeks?\s+ago/i, "$1 tuần trước")
    .replace(/(\d+)\s+months?\s+ago/i, "$1 tháng trước")
    .replace(/(\d+)\s+years?\s+ago/i, "$1 năm trước")
    .replace(/Yesterday/i, "Hôm qua");
}

export function extractYtInitialData(html: string): any | null {
  const marker = "ytInitialData = ";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;
  const jsonStart = startIdx + marker.length;
  const endScriptIdx = html.indexOf(";</script>", jsonStart);
  if (endScriptIdx !== -1) {
    try {
      return JSON.parse(html.slice(jsonStart, endScriptIdx));
    } catch {}
  }
  return null;
}

export interface ScrapedVideoItem {
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt?: string;
  publishedText?: string;
  duration?: string;
}

function parseVideosFromYtObject(obj: any, defaultChannel = ""): ScrapedVideoItem[] {
  const results: ScrapedVideoItem[] = [];

  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;

    // 1. Modern lockupViewModel (YouTube 2024-2025)
    if (node.lockupViewModel && node.lockupViewModel.contentId) {
      const lockup = node.lockupViewModel;
      const vId = lockup.contentId;
      if (typeof vId === "string" && vId.length === 11) {
        const title =
          lockup.metadata?.lockupMetadataViewModel?.title?.content ||
          lockup.rendererContext?.accessibilityContext?.label ||
          `Video ${vId}`;

        let duration = "05:00";
        try {
          const overlays = lockup.contentImage?.thumbnailViewModel?.overlays || [];
          for (const ov of overlays) {
            const badges = ov?.thumbnailBottomOverlayViewModel?.badges || [];
            for (const b of badges) {
              if (b?.thumbnailBadgeViewModel?.text) {
                duration = b.thumbnailBadgeViewModel.text;
                break;
              }
            }
          }
        } catch {}

        let publishedText = "";
        try {
          const rows =
            lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
          for (const row of rows) {
            const parts = row?.metadataParts || [];
            for (const part of parts) {
              const t = part?.text?.content || "";
              if (
                t.includes("ago") ||
                t.includes("trước") ||
                t.includes("Streamed") ||
                t.includes("phát") ||
                t.includes("Hôm qua")
              ) {
                publishedText = translateRelativeTime(t);
                break;
              }
            }
          }
        } catch {}

        results.push({
          youtubeId: vId,
          title: decodeHtmlEntities(title),
          channel: defaultChannel,
          thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
          duration,
          publishedText,
        });
      }
    }

    // 2. Traditional videoRenderer
    if (node.videoRenderer && node.videoRenderer.videoId) {
      const vr = node.videoRenderer;
      const vId = vr.videoId;
      if (typeof vId === "string" && vId.length === 11) {
        const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || `Video ${vId}`;
        const duration = vr.lengthText?.simpleText || "05:00";
        const channel = vr.ownerText?.runs?.[0]?.text || defaultChannel;
        const publishedText = translateRelativeTime(vr.publishedTimeText?.simpleText || "");

        results.push({
          youtubeId: vId,
          title: decodeHtmlEntities(title),
          channel,
          thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
          duration,
          publishedText,
        });
      }
    }

    // 3. playlistVideoRenderer
    if (node.playlistVideoRenderer && node.playlistVideoRenderer.videoId) {
      const pvr = node.playlistVideoRenderer;
      const vId = pvr.videoId;
      if (typeof vId === "string" && vId.length === 11) {
        const title = pvr.title?.runs?.[0]?.text || pvr.title?.simpleText || `Video ${vId}`;
        const duration = pvr.lengthText?.simpleText || "05:00";
        const channel = pvr.shortBylineText?.runs?.[0]?.text || defaultChannel;

        results.push({
          youtubeId: vId,
          title: decodeHtmlEntities(title),
          channel,
          thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
          duration,
          publishedText: "",
        });
      }
    }

    for (const key of Object.keys(node)) {
      if (typeof node[key] === "object") {
        walk(node[key]);
      }
    }
  };

  walk(obj);
  return results;
}

async function fetchInnertubeContinuation(token: string): Promise<any | null> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_USER_AGENT,
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240401.01.00",
            hl: "vi",
            gl: "VN",
          },
        },
        continuation: token,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Innertube continuation fetch error:", e);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput = (body.url || body.input || body.channelOrPlaylist || "").trim();

    if (!rawInput) {
      return NextResponse.json(
        { error: "Vui lòng nhập đường dẫn kênh (@kênh, youtube.com/@...) hoặc playlist YouTube." },
        { status: 400 }
      );
    }

    let playlistId: string | null = null;
    let channelId: string | null = null;
    let handle: string | null = null;

    // 1. Detect Playlist
    const playlistMatch = rawInput.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
    if (playlistMatch) {
      playlistId = playlistMatch[1];
    }

    // 2. Detect Direct Channel ID (/channel/UC...)
    const channelIdMatch = rawInput.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/i);
    if (channelIdMatch) {
      channelId = channelIdMatch[1];
    }

    // 3. Detect Handle (@username or /@username)
    const handleMatch = rawInput.match(/@([a-zA-Z0-9_.-]+)/i);
    if (handleMatch) {
      handle = handleMatch[1];
    }

    // ─── STRATEGY A: DIRECT HTML + INNERTUBE SCRAPING (50 - 60 VIDEOS) ───
    if (!playlistId && (handle || channelId)) {
      try {
        const channelVideosUrl = handle
          ? `https://www.youtube.com/@${handle}/videos`
          : `https://www.youtube.com/channel/${channelId}/videos`;

        const channelRes = await fetch(channelVideosUrl, {
          headers: {
            "User-Agent": BROWSER_USER_AGENT,
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
          },
          cache: "no-store",
        });

        if (channelRes.ok) {
          const html = await channelRes.text();
          const data = extractYtInitialData(html);

          if (data) {
            const sourceChannel =
              data.header?.c4TabbedHeaderRenderer?.title ||
              data.header?.pageHeaderRenderer?.pageTitle?.runs?.[0]?.text ||
              data.metadata?.channelMetadataRenderer?.title ||
              handle ||
              "YouTube Channel";

            const page1Videos = parseVideosFromYtObject(data, sourceChannel);
            const videoMap = new Map<string, ScrapedVideoItem>();
            page1Videos.forEach((v) => videoMap.set(v.youtubeId, v));

            // Check for continuation token to fetch Page 2 (reaching 50-60 videos)
            const strData = JSON.stringify(data);
            const tokenMatch = strData.match(/"continuationCommand":\{"token":"([^"]+)"/);

            if (tokenMatch && tokenMatch[1]) {
              const browseData = await fetchInnertubeContinuation(tokenMatch[1]);
              if (browseData) {
                const page2Videos = parseVideosFromYtObject(browseData, sourceChannel);
                page2Videos.forEach((v) => {
                  if (!videoMap.has(v.youtubeId)) {
                    videoMap.set(v.youtubeId, v);
                  }
                });
              }
            }

            const scrapedVideos = Array.from(videoMap.values());
            if (scrapedVideos.length > 0) {
              return NextResponse.json({
                success: true,
                type: "channel",
                sourceTitle: sourceChannel,
                sourceChannel,
                total: scrapedVideos.length,
                videos: scrapedVideos,
              });
            }
          }
        }
      } catch (channelScrapeErr) {
        console.error("Direct channel scraping failed, falling back to RSS:", channelScrapeErr);
      }
    }

    // ─── STRATEGY B: DIRECT PLAYLIST SCRAPING (UP TO 60 - 100 VIDEOS) ────
    if (playlistId) {
      try {
        const plUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        const plRes = await fetch(plUrl, {
          headers: {
            "User-Agent": BROWSER_USER_AGENT,
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
          },
          cache: "no-store",
        });

        if (plRes.ok) {
          const html = await plRes.text();
          const data = extractYtInitialData(html);

          if (data) {
            const plTitle =
              data.header?.playlistHeaderRenderer?.title?.simpleText ||
              data.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
              data.metadata?.playlistMetadataRenderer?.title ||
              "YouTube Playlist";

            const plVideos = parseVideosFromYtObject(data, plTitle);
            const plMap = new Map<string, ScrapedVideoItem>();
            plVideos.forEach((v) => plMap.set(v.youtubeId, v));

            // Try continuation for long playlists if present
            const strData = JSON.stringify(data);
            const tokenMatch = strData.match(/"continuationCommand":\{"token":"([^"]+)"/);
            if (tokenMatch && tokenMatch[1]) {
              const browseData = await fetchInnertubeContinuation(tokenMatch[1]);
              if (browseData) {
                const nextVideos = parseVideosFromYtObject(browseData, plTitle);
                nextVideos.forEach((v) => {
                  if (!plMap.has(v.youtubeId)) {
                    plMap.set(v.youtubeId, v);
                  }
                });
              }
            }

            const scrapedList = Array.from(plMap.values());
            if (scrapedList.length > 0) {
              return NextResponse.json({
                success: true,
                type: "playlist",
                sourceTitle: plTitle,
                sourceChannel: "YouTube Playlist",
                total: scrapedList.length,
                videos: scrapedList,
              });
            }
          }
        }
      } catch (plScrapeErr) {
        console.error("Direct playlist scraping failed, falling back to RSS:", plScrapeErr);
      }
    }

    // ─── STRATEGY C: ATOM RSS FEED FALLBACK (15 VIDEOS) ──────────────────
    // If handle provided and channelId not yet resolved, resolve channelId for RSS
    if (!playlistId && !channelId && handle) {
      try {
        const handleUrl = `https://www.youtube.com/@${handle}`;
        const handleRes = await fetch(handleUrl, {
          headers: {
            "User-Agent": BROWSER_USER_AGENT,
            "Accept-Language": "vi-VN,vi;q=0.9",
          },
          next: { revalidate: 3600 },
        });

        if (handleRes.ok) {
          const html = await handleRes.text();
          const idMatch =
            html.match(/itemprop="channelId"\s+content="(UC[\w-]{22})"/i) ||
            html.match(/itemprop="identifier"\s+content="(UC[\w-]{22})"/i) ||
            html.match(/"channelId":"(UC[\w-]{22})"/i) ||
            html.match(/"browseId":"(UC[\w-]{22})"/i) ||
            html.match(/canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/i);

          if (idMatch) {
            channelId = idMatch[1];
          }
        }
      } catch (e) {
        console.error("Failed to resolve channel handle for fallback:", e);
      }
    }

    let feedUrl: string | null = null;
    let queryType: "playlist" | "channel" = "channel";

    if (playlistId) {
      feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
      queryType = "playlist";
    } else if (channelId) {
      feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      queryType = "channel";
    }

    if (feedUrl) {
      const feedRes = await fetch(feedUrl, {
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
        },
        cache: "no-store",
      });

      if (feedRes.ok) {
        const xml = await feedRes.text();

        const authorMatch = xml.match(/<author>\s*<name>([^<]+)<\/name>/i);
        const feedTitleMatch = xml.match(/<title>([^<]+)<\/title>/i);
        const sourceChannel = authorMatch ? decodeHtmlEntities(authorMatch[1]) : "YouTube";
        const sourceTitle = feedTitleMatch
          ? decodeHtmlEntities(feedTitleMatch[1])
          : queryType === "playlist"
          ? "YouTube Playlist"
          : sourceChannel;

        const entryMatches = xml.split("<entry>").slice(1);
        const videos: ScrapedVideoItem[] = [];

        for (const entry of entryMatches) {
          const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
          if (!videoIdMatch) continue;
          const youtubeId = videoIdMatch[1].trim();

          const titleMatch =
            entry.match(/<media:title>([^<]+)<\/media:title>/i) ||
            entry.match(/<title>([^<]+)<\/title>/i);
          const rawTitle = titleMatch ? titleMatch[1] : `Video ${youtubeId}`;
          const title = decodeHtmlEntities(rawTitle);

          const authorEntryMatch = entry.match(/<author>\s*<name>([^<]+)<\/name>/i);
          const channel = authorEntryMatch
            ? decodeHtmlEntities(authorEntryMatch[1])
            : sourceChannel;

          const thumbMatch = entry.match(/<media:thumbnail\s+url="([^"]+)"/i);
          const thumbnail = thumbMatch
            ? thumbMatch[1]
            : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

          const publishedMatch = entry.match(/<published>([^<]+)<\/published>/i);
          const publishedAt = publishedMatch ? publishedMatch[1].trim() : "";
          const publishedText = publishedAt
            ? translateRelativeTime(
                new Date(publishedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              )
            : "";

          videos.push({
            youtubeId,
            title,
            channel,
            thumbnail,
            publishedAt,
            publishedText,
            duration: "05:00",
          });
        }

        if (videos.length > 0) {
          return NextResponse.json({
            success: true,
            type: queryType,
            sourceTitle,
            sourceChannel,
            total: videos.length,
            videos,
          });
        }
      }
    }

    return NextResponse.json(
      {
        error:
          "Không tìm thấy video nào từ liên kết YouTube đã cung cấp. Vui lòng kiểm tra lại link kênh hoặc playlist (đảm bảo ở chế độ công khai).",
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error scraping YouTube channel/playlist:", error);
    return NextResponse.json(
      { error: error.message || "Đã xảy ra lỗi khi quét danh sách video YouTube." },
      { status: 500 }
    );
  }
}
