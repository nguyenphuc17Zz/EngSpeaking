"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const [period, setPeriod] = useState("30d");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/progress/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period, learnerId: "default" }) });
      const data = await res.json();
      setReport(data.report);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Progress Report (§36-39)</CardTitle><CardDescription className="text-xs">On-demand + cache (§96) — period+version, không invent (§99)</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Period:</Label>
            <Select value={period} onValueChange={(v: string | null) => v && setPeriod(v)}>
              <SelectTrigger className="w-[120px]"><span>{period}</span></SelectTrigger>
              <SelectContent><SelectItem value="7d">7 days</SelectItem><SelectItem value="30d">30 days</SelectItem><SelectItem value="90d">90 days</SelectItem></SelectContent>
            </Select>
            <Button onClick={generate} disabled={loading} size="sm">{loading ? "Generating..." : "Generate Report"}</Button>
          </div>
          {report ? (
            <div className="rounded border p-3 space-y-2 text-sm">
              <div className="font-medium">{(report as { headline?: string }).headline || "Report"}</div>
              <div>Major improvements: {JSON.stringify((report as { majorImprovements?: unknown[] }).majorImprovements?.slice(0, 2) || [])}</div>
              <div>Persistent challenges: {JSON.stringify((report as { persistentChallenges?: unknown[] }).persistentChallenges?.slice(0, 2) || [])}</div>
              <div>Next focus: {(report as { nextFocus?: string }).nextFocus || "—"} <Badge variant="outline">confidence {(report as { confidence?: number }).confidence ?? 0}</Badge></div>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[300px]">{JSON.stringify(report, null, 2)}</pre>
            </div>
          ) : <p className="text-sm text-muted-foreground">Chưa có report — bấm Generate (cache 30m, §96).</p>}
        </CardContent>
      </Card>
      <Card className="bg-muted/30"><CardContent className="pt-3 text-xs text-muted-foreground">Correlation-only language (§101): associated with, not caused. Confidence per insight §102.</CardContent></Card>
    </div>
  );
}
