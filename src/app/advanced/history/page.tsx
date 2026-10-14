"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdvancedStore } from "@/stores/advanced-store";

interface HistoryItem {
  id: string;
  primary_skill: string;
  estimated_duration: number;
  created_at: string;
  score?: number;
  level?: string;
}

export default function AdvancedHistoryPage() {
  const completedSessions = useAdvancedStore((s) => s.completedSessions || []);
  const sessionSummary = useAdvancedStore((s) => s.sessionSummary);
  const [apiSessions, setApiSessions] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/advanced/session?limit=20")
      .then((r) => r.json())
      .then((d) => setApiSessions(d.sessions || []))
      .catch(() => {});
  }, []);

  const localItems: HistoryItem[] = [
    ...(sessionSummary && !completedSessions.some((c) => c.sessionId === sessionSummary.sessionId)
      ? [sessionSummary]
      : []),
    ...completedSessions,
  ].map((s) => ({
    id: s.sessionId,
    primary_skill: `${s.track} (${s.level})`,
    estimated_duration: Math.max(
      1,
      Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 60000) || s.completedTasks * 2
    ),
    created_at: s.completedAt || s.startedAt,
    score: s.averageOverallScore,
    level: s.level,
  }));

  const seenIds = new Set(localItems.map((i) => i.id));
  const mergedSessions = [
    ...localItems,
    ...apiSessions.filter((s) => !seenIds.has(s.id)),
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Lịch sử Advanced Sessions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {mergedSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có phiên nào.</p>
        ) : (
          mergedSessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded border p-3">
              <div className="text-sm">
                <div className="font-medium">
                  {s.id.slice(0, 8)} — {s.primary_skill || "advanced"}
                  {typeof s.score === "number" ? ` • ${s.score}/100` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.estimated_duration} min • {new Date(s.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
              <Badge variant="outline">{s.level || s.id.slice(0, 6)}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
