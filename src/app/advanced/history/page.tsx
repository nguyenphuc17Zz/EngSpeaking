"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdvancedHistoryPage() {
  const [sessions, setSessions] = useState<Array<{ id: string; primary_skill: string; estimated_duration: number; created_at: string }>>([]);
  useEffect(() => {
    fetch("/api/advanced/session?limit=20").then((r) => r.json()).then((d) => setSessions(d.sessions || [])).catch(() => {});
  }, []);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Lịch sử Advanced Sessions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {sessions.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có phiên nào.</p> : sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded border p-3">
            <div className="text-sm">
              <div className="font-medium">{s.id.slice(0, 8)} — {s.primary_skill || "advanced"}</div>
              <div className="text-xs text-muted-foreground">{s.estimated_duration} min • {new Date(s.created_at).toLocaleString("vi-VN")}</div>
            </div>
            <Badge variant="outline">{s.id.slice(0, 6)}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
