"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFoundationStore } from "@/stores/foundation-store";
import { ExerciseCard } from "@/components/foundation/ExerciseCard";

export default function HistoryPage() {
  const { history } = useFoundationStore();
  const [sessions, setSessions] = useState<unknown[]>([]);

  useEffect(() => {
    fetch("/api/foundation/sessions?limit=20").then((r) => r.json()).then((d) => setSessions(d.sessions || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử local (persisted)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có bài nào.</p> : (
            history.slice().reverse().map((h, i) => (
              <div key={i} className="rounded-xl border p-3 space-y-2">
                <ExerciseCard exercise={h.exercise} />
                <div className="text-xs space-y-1">
                  <p><span className="text-muted-foreground">Transcript:</span> {h.attempt.transcript}</p>
                  <p><span className="text-muted-foreground">Score:</span> {h.evaluation.score.overall} • {h.evaluation.classification} • TTFW {h.evaluation.timeToFirstWordMs ?? "?"}ms • {h.evaluation.durationMs ?? "?"}ms • hints {h.evaluation.hintsUsed}</p>
                  <p className="text-muted-foreground">Feedback: {h.evaluation.feedback.whatWentWell} {h.evaluation.feedback.mainIssue ? `| Issue: ${h.evaluation.feedback.mainIssue}` : ""}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Sessions gần đây (Supabase nếu cấu hình)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {(sessions as Array<{ id: string; skill: string; exercise_type: string; difficulty: number; status: string; started_at: string }>).length === 0 ? <p className="text-muted-foreground">Chưa có session server.</p> : (
            (sessions as Array<{ id: string; skill: string; exercise_type: string; difficulty: number; status: string; started_at: string }>).map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b py-1">
                <span>{s.id.slice(0, 8)} • {s.skill} • {s.exercise_type} • {s.difficulty}</span>
                <Badge variant="outline" className="text-[11px]">{s.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
