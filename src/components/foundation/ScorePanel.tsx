"use client";
import type { FoundationEvaluation } from "@/types/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function ScorePanel({ evaluation }: { evaluation: FoundationEvaluation }) {
  const { score, feedback, classification } = evaluation;
  const clsLabel = classification === "too_easy" ? "Quá dễ" : classification === "too_hard" ? "Quá khó" : "Phù hợp";
  const clsColor = classification === "too_easy" ? "bg-emerald-500" : classification === "too_hard" ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Practice Score: {score.overall}/100</span>
            <Badge className={`${clsColor} text-white text-xs`}>{clsLabel} {evaluation.suggestedDifficultyDelta > 0 ? "→ +1" : evaluation.suggestedDifficultyDelta < 0 ? "→ -1" : ""}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={score.overall} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <ScoreRow label="Hoàn thành" v={score.completion} />
            <ScoreRow label="Tốc độ phản xạ" v={score.responseSpeed} />
            <ScoreRow label="Tạo câu" v={score.sentenceFormation} />
            <ScoreRow label="Chính xác" v={score.accuracy} />
            <ScoreRow label="Trôi chảy" v={score.fluency} />
            <ScoreRow label="Truy xuất" v={score.retrieval} />
            <ScoreRow label="Mở rộng" v={score.expansion} />
            <ScoreRow label="Tự tin" v={score.confidence} />
            <ScoreRow label="Phục hồi" v={score.recovery} />
          </div>
          {score.fillerCount != null && <p className="text-xs text-muted-foreground">Filler: {score.fillerCount} • {score.pauseBehavior} {score.insufficientEvidence && <span className="text-amber-600">(thiếu bằng chứng)</span>}</p>}
          <p className="text-xs text-muted-foreground">Gợi ý độ khó kế: {evaluation.suggestedDifficultyDelta === 1 ? "Tăng 1 mức" : evaluation.suggestedDifficultyDelta === -1 ? "Giảm 1 mức" : "Giữ nguyên"} • Hints: {evaluation.hintsUsed} • TTFW: {evaluation.timeToFirstWordMs ?? "?"}ms • {evaluation.durationMs ?? "?"}ms</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Phản hồi</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p><span className="font-medium text-emerald-700">Tốt:</span> {feedback.whatWentWell}</p>
          {feedback.mainIssue && <p><span className="font-medium text-amber-700">Cần sửa:</span> {feedback.mainIssue}</p>}
          {feedback.betterVersion && <p className="rounded bg-muted p-2 text-xs"><span className="font-medium">Gợi ý tốt hơn:</span> {feedback.betterVersion}</p>}
          {feedback.fillerNote && <p className="text-xs text-muted-foreground">Filler: {feedback.fillerNote}</p>}
          <p><span className="font-medium">Thử lại:</span> {feedback.tryAgain}</p>
          <p className="text-xs text-muted-foreground"><span className="font-medium">Mục tiêu nhỏ kế:</span> {feedback.nextMicroGoal}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreRow({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{v}</span>
    </div>
  );
}
