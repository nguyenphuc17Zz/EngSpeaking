"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShadowingStudioEngine } from "@/components/foundation/shadowing/ShadowingStudioEngine";
import {
  getVideoLibrary,
  addVideoToLibrary,
  updateVideoInLibrary,
  type SavedVideoLesson,
} from "@/lib/foundation/shadowing/shadowing-library.service";
import {
  getTranscript,
  saveTranscript,
} from "@/lib/foundation/shadowing/shadowing-transcript-db.service";
import { mergeFragmentedSegments } from "@/lib/foundation/shadowing/transcript-stitcher";
import {
  CORODOMO_VIDEO_PRESETS,
  type CorodomoVideoLesson,
  type CorodomoSegment,
} from "@/lib/foundation/shadowing/corodomo-presets";
import { Loader2, ArrowLeft, AlertCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShadowingVideoStudioPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = (params?.videoId as string) || "";

  const [lesson, setLesson] = useState<CorodomoVideoLesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;

    let isCancelled = false;

    const loadVideoLesson = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Search in local Video Library
        const lib = getVideoLibrary();
        let matched: SavedVideoLesson | CorodomoVideoLesson | undefined = lib.find(
          (v) => v.youtubeId === videoId || v.id === videoId
        );

        // 2. Search in Presets
        if (!matched) {
          matched = CORODOMO_VIDEO_PRESETS.find(
            (p) => p.youtubeId === videoId || p.id === videoId
          );
        }

        // If found in library or presets:
        if (matched) {
          let segments = matched.segments || [];
          if (segments.length === 0 && matched.youtubeId) {
            const fromDb = await getTranscript(matched.youtubeId);
            if (fromDb && fromDb.length > 0) {
              segments = fromDb;
            }
          }

          // Auto-fetch fallback from YouTube API if transcript is still empty (e.g. batch imported channel videos)
          if (
            segments.length === 0 &&
            matched.youtubeId &&
            matched.youtubeId !== "custom" &&
            (matched.youtubeId.length === 11 || matched.youtubeId.length >= 5)
          ) {
            try {
              const res = await fetch("/api/shadowing/youtube-transcript", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${matched.youtubeId}` }),
              });
              const data = await res.json();
              if (res.ok && data.segments && data.segments.length > 0) {
                segments = data.segments.map((s: any, idx: number) => ({
                  segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
                  text: s.text,
                  start_time: s.start_time,
                  end_time: s.end_time,
                  translationVi: s.translationVi || "",
                  thoughtGroups: s.thoughtGroups || s.text,
                  ipa: s.ipa || "",
                  wordsWithIpa: s.wordsWithIpa,
                }));
                await saveTranscript(matched.youtubeId, segments);
                updateVideoInLibrary(matched.id, {
                  title: data.title || matched.title,
                  segmentCount: segments.length,
                  hasTranscript: true,
                });
              }
            } catch (fetchErr) {
              console.warn("Auto-fetch captions warning:", fetchErr);
            }
          }

          const healed: CorodomoSegment[] = mergeFragmentedSegments(segments).map((s, idx) => ({
            ...s,
            segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
          })) as CorodomoSegment[];
          if (!isCancelled) {
            setLesson({
              ...matched,
              segments: healed,
            });
            setIsLoading(false);
          }
          return;
        }

        // 3. Not found locally: check if it's a YouTube video ID and auto-fetch transcript
        if (videoId.length === 11 || videoId.length >= 5) {
          const res = await fetch("/api/shadowing/youtube-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
          });

          const data = await res.json();
          if (!res.ok || !data.segments || data.segments.length === 0) {
            throw new Error(data.error || "Không thể lấy phụ đề cho video này từ YouTube.");
          }

          const healed: CorodomoSegment[] = mergeFragmentedSegments(
            data.segments.map((s: any, idx: number) => ({
              segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
              text: s.text,
              start_time: s.start_time,
              end_time: s.end_time,
              translationVi: s.translationVi || "",
              thoughtGroups: s.thoughtGroups || s.text,
              ipa: s.ipa || "",
              wordsWithIpa: s.wordsWithIpa,
            }))
          ).map((s, idx) => ({
            ...s,
            segment_id: s.segment_id || `seg_${String(idx + 1).padStart(3, "0")}`,
          })) as CorodomoSegment[];

          await saveTranscript(videoId, healed);

          const newLesson: CorodomoVideoLesson = {
            id: `custom_${videoId}`,
            youtubeId: videoId,
            title: data.title || `YouTube Video (${videoId})`,
            channel: data.channel || "YouTube",
            cefrLevel: "Custom",
            playlistName: data.channel || "YouTube",
            playlistId: `custom_pl_${videoId}`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            duration: data.duration || "10:00",
            publishedAt: data.publishedAt,
            segments: healed,
          };

          addVideoToLibrary(newLesson);

          if (!isCancelled) {
            setLesson(newLesson);
            setIsLoading(false);
          }
          return;
        }

        throw new Error("Không tìm thấy bài học này trong thư viện.");
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    };

    loadVideoLesson();

    return () => {
      isCancelled = true;
    };
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 px-4">
        <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
          <Loader2 className="size-6 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-foreground">Đang tải bài học và phụ đề...</p>
          <p className="text-xs text-muted-foreground">ID: {videoId}</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4 text-center">
        <div className="size-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-xs">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-base font-bold text-foreground">Không tìm thấy bài học</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error || "Bài học không tồn tại hoặc đã bị xóa khỏi thư viện."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/shadowing")}
          className="rounded-xl text-xs gap-1.5"
        >
          <ArrowLeft className="size-3.5" />
          <span>Quay về Thư viện Shadowing</span>
        </Button>
      </div>
    );
  }

  return (
    <ShadowingStudioEngine
      initialLesson={lesson}
      onBackToHub={() => router.push("/shadowing")}
      onLessonUpdated={(updated) => setLesson(updated)}
      onNavigateToVideo={(newId) => router.push(`/shadowing/video/${newId}`)}
    />
  );
}
