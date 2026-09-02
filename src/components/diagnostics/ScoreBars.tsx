"use client";

import { Progress } from "@/components/ui/progress";
import type { SpeakingDimensions } from "@/types/diagnostics";
import { cn } from "@/lib/utils";

const DIMENSION_CONFIG: Record<
  keyof SpeakingDimensions,
  { label: string; labelVi: string; desc: string }
> = {
  fluency: { label: "Fluency", labelVi: "Độ trôi chảy", desc: "Tốc độ và sự liên tục khi nói" },
  responseSpeed: { label: "Response Speed", labelVi: "Tốc độ phản xạ", desc: "Thời gian bắt đầu nói (TTFW)" },
  grammar: { label: "Grammar", labelVi: "Ngữ pháp khẩu ngữ", desc: "Độ chính xác cấu trúc câu" },
  vocabulary: { label: "Vocabulary", labelVi: "Từ vựng kích hoạt", desc: "Sử dụng từ vựng chủ động" },
  naturalness: { label: "Naturalness", labelVi: "Độ tự nhiên", desc: "Cách dùng từ & ngữ điệu tự nhiên" },
  communication: { label: "Communication", labelVi: "Hiệu quả truyền đạt", desc: "Truyền tải trọn vẹn thông điệp" },
  confidence: { label: "Confidence", labelVi: "Độ tự tin", desc: "Âm lượng & không ngập ngừng" },
  pronunciation: { label: "Pronunciation", labelVi: "Phát âm", desc: "Độ rõ ràng của âm thanh" },
};

export function ScoreBars({ dimensions }: { dimensions: SpeakingDimensions }) {
  return (
    <div className="space-y-3.5">
      {(Object.keys(DIMENSION_CONFIG) as Array<keyof SpeakingDimensions>).map((k) => {
        const v = dimensions[k];
        const isNA = k === "pronunciation" && v === -1;
        const config = DIMENSION_CONFIG[k];

        return (
          <div key={k} className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-foreground">{config.labelVi}</span>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">({config.label})</span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {isNA ? "Chưa có audio" : `${v}/100`}
              </span>
            </div>

            {isNA ? (
              <div className="h-2 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                Phát âm chỉ khả dụng khi bật audio STT server
              </div>
            ) : (
              <Progress value={v} className="h-2 rounded-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}
