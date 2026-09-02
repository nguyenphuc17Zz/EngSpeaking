"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreBars } from "@/components/diagnostics/ScoreBars";
import { BottleneckCard } from "@/components/diagnostics/BottleneckCard";
import type { SpeakingEvaluation } from "@/types/diagnostics";

export default function DiagnosticsSessionPage() {
  const { id } = useParams<{ id: string }>();
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch(`/api/evaluation/session/${id}`).then((r) => r.json()).then((d) => setEvaluation(d.evaluation)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (!evaluation) return <p className="text-sm text-muted-foreground">Không tìm thấy evaluation.</p>;

  const highlightTranscript = (text: string, issues: SpeakingEvaluation["grammarIssues"]): React.ReactNode => {
    if (!issues?.length) return text;
    let nodes: React.ReactNode[] = [text];
    for (const iss of issues.slice(0, 3)) {
      if (!iss.span) continue;
      const span = iss.span;
      const newNodes: React.ReactNode[] = [];
      for (const node of nodes) {
        if (typeof node !== "string") { newNodes.push(node); continue; }
        const idx = (node as string).toLowerCase().indexOf(span.toLowerCase());
        if (idx === -1) newNodes.push(node);
        else {
          newNodes.push((node as string).slice(0, idx));
          newNodes.push(<span key={`${iss.id}-${idx}`} className="bg-amber-200 rounded px-0.5" title={`${iss.category}: ${iss.explanation}`}>{(node as string).slice(idx, idx + span.length)}</span>);
          newNodes.push((node as string).slice(idx + span.length));
        }
      }
      nodes = newNodes;
    }
    return <>{nodes}</>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Session {evaluation.sessionId.slice(0, 8)} • Score {evaluation.overallPracticeScore}</CardTitle></CardHeader>
        <CardContent><Progress value={evaluation.overallPracticeScore} /></CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">8 Dimensions</CardTitle></CardHeader><CardContent><ScoreBars dimensions={evaluation.dimensions} /></CardContent></Card>
        <div className="space-y-3">
          {evaluation.priorityBottlenecks[0] && <BottleneckCard bottleneck={evaluation.priorityBottlenecks[0]} primary />}
          {evaluation.priorityBottlenecks[1] && <BottleneckCard bottleneck={evaluation.priorityBottlenecks[1]} />}
        </div>
      </div>

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Evidence-linked transcript (§71)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(evaluation.turnEvaluations || []).map((te) => (
            <div key={te.turnId} className="rounded border p-2">
              <div className="text-xs text-muted-foreground">Turn {te.turnId.slice(0, 6)} • {te.isShortAnswer ? "short answer" : ""}</div>
              <div>{highlightTranscript(te.turnId, evaluation.grammarIssues)}</div>
              <div className="text-xs text-muted-foreground">issues: {te.issues.map((i) => `${i.category} (${i.severity})`).join(", ") || "—"}</div>
            </div>
          ))}
          {/* Fallback: show grammar issues if turnEvaluations empty */}
          {(!evaluation.turnEvaluations?.length && evaluation.grammarIssues?.length) && (
            <div className="space-y-1">
              {evaluation.grammarIssues.slice(0, 5).map((g) => (
                <div key={g.id} className="rounded bg-muted p-2 text-xs"><span className="font-medium">{g.category} ({g.severity})</span>: {g.explanation} {g.span && <>— "<span className="bg-amber-200 px-0.5">{g.span}</span>" → {g.correction}</>}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between"><span>Detailed report</span><button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs underline">{showAdvanced ? "Ẩn" : "Hiện chi tiết (§48)"}</button></CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Strengths:</strong> {evaluation.strengths.map((s) => `${s.category}: ${s.description}`).join(" | ") || "—"}</p>
          <p><strong>Weaknesses:</strong> {evaluation.weaknesses.map((w) => `${w.category} (${w.severity})`).join(" | ") || "—"}</p>
          <p><strong>Patterns:</strong> {evaluation.recurringPatterns.map((p) => `${p.patternKey} (${p.frequency}×)`).join(" | ") || "—"}</p>
          {showAdvanced && (
            <div className="space-y-1 text-xs">
              <p>Evidence: {evaluation.evidence.map((e) => e.description).join(" | ")}</p>
              <p>Turns: {(evaluation.turnEvaluations || []).length} • Grammar issues: {(evaluation.grammarIssues || []).length}</p>
              <p>Evaluator {evaluation.evaluatorVersion} • Model {evaluation.model} • {new Date(evaluation.generatedAt).toLocaleString("vi-VN")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
