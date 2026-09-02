"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function UsagePage() {
  const [data, setData] = useState<{ stats?: { requestsToday: number; requestsWeek: number; tokensToday: number; tokensWeek: number; byProvider: Record<string, number>; cacheHitRate: number; avgLatency: number; errors: number }; recent?: Array<{ requestId: string; task: string; providerId: string; modelId: string; latencyMs: number; cacheHit: boolean; status: string }>; dbUsage?: unknown[] } | null>(null);

  useEffect(() => {
    fetch("/api/ai/usage?limit=20").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const stats = data?.stats;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">AI Usage Dashboard (§50)</h1><p className="text-sm text-muted-foreground">Application-observed usage (không phải official provider quota). Tokens/latency từ orchestrator telemetry.</p></div>

      {stats ? (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Requests</CardTitle></CardHeader><CardContent className="text-sm">Today: <span className="font-mono">{stats.requestsToday}</span> <br /> Week: <span className="font-mono">{stats.requestsWeek}</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tokens</CardTitle></CardHeader><CardContent className="text-sm">Today: <span className="font-mono">{stats.tokensToday}</span> <br /> Week: <span className="font-mono">{stats.tokensWeek}</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Performance</CardTitle></CardHeader><CardContent className="text-sm">Avg latency: {stats.avgLatency}ms <br /> Cache: {(stats.cacheHitRate * 100).toFixed(1)}% <br /> Errors: {stats.errors}</CardContent></Card>
        </div>
      ) : <p className="text-sm text-muted-foreground">Đang tải...</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">By Provider</CardTitle></CardHeader>
        <CardContent className="text-sm">{stats?.byProvider ? Object.entries(stats.byProvider).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><Badge variant="outline">{String(v)}</Badge></div>) : "—"}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Requests</CardTitle><CardDescription className="text-xs">requestId • task • provider/model • latency • cacheHit</CardDescription></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {data?.recent?.length ? data.recent.map((r) => (
            <div key={r.requestId} className="flex items-center justify-between rounded border px-2 py-1">
              <span>{r.task} — {r.providerId}/{r.modelId} — {r.latencyMs}ms {r.cacheHit ? "• cache hit" : ""}</span>
              <Badge variant={r.status === "success" ? "secondary" : "destructive"}>{r.status}</Badge>
            </div>
          )) : <p className="text-muted-foreground">Chưa có requests.</p>}
        </CardContent>
      </Card>

      <Card className="bg-muted/40"><CardContent className="pt-3 text-xs text-muted-foreground">Cost estimation: unknown (chưa cấu hình pricing) — hiển thị observed usage vs estimated cost vs official quota (§51) phân biệt.</CardContent></Card>
    </div>
  );
}
