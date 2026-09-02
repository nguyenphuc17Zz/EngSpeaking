"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DiagnosticsHistoryPage() {
  const [evals, setEvals] = useState<Array<{ id: string; session_id: string; session_type: string; overall_practice_score: number; completeness: string; generated_at: string; confidence: { overall: string } }>>([]);

  useEffect(() => {
    fetch("/api/evaluation/history?limit=20").then((r) => r.json()).then((d) => setEvals(d.evaluations || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử Diagnostics (§67)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {evals.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có evaluation nào.</p> : (
            evals.map((e) => (
              <Link key={e.id} href={`/diagnostics/session/${e.id}`} className="flex items-center justify-between rounded border p-3 hover:bg-muted">
                <div className="text-sm">
                  <div className="font-medium">{e.session_id.slice(0, 8)} • {e.session_type} • Score {e.overall_practice_score}</div>
                  <div className="text-xs text-muted-foreground">{new Date(e.generated_at).toLocaleString("vi-VN")} • {e.completeness}</div>
                </div>
                <Badge variant="outline">{e.confidence?.overall || "medium"}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
