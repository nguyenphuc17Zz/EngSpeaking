"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AIDebugPage() {
  const [logs, setLogs] = useState<Array<{ requestId: string; task: string; providerId: string; modelId: string; latencyMs: number; cacheHit: boolean; status: string; errorCode?: string }>>([]);

  useEffect(() => {
    fetch("/api/ai/debug?limit=50").then((r) => r.json()).then((d) => setLogs(d.logs || [])).catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">AI Debug View (§59) — Dev only</h1><p className="text-sm text-muted-foreground">Request • Task • Provider • Model • Prompt version • Context size • Latency • Cache • Retries • Validation — không lộ chain-of-thought (§60)</p></div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent AI Requests</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {logs.length ? logs.map((l) => (
            <div key={l.requestId} className="rounded border p-2 flex flex-col gap-1">
              <div className="flex items-center justify-between"><span className="font-mono">{l.requestId.slice(0, 8)} • {l.task}</span><Badge variant={l.status === "success" ? "secondary" : "destructive"}>{l.status}</Badge></div>
              <div>Provider: {l.providerId} • Model: {l.modelId} • {l.latencyMs}ms {l.cacheHit ? "• cache hit" : ""} {l.errorCode ? `• ${l.errorCode}` : ""}</div>
            </div>
          )) : <p className="text-muted-foreground">Chưa có logs.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
