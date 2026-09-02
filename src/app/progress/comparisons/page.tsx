"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ComparisonsPage() {
  const [result, setResult] = useState<{ status: string; deltas: Record<string, number>; improved: string[]; declined: string[]; evidence: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const runCompare = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
      const res = await fetch("/api/progress/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodA: { start: twoWeeksAgo.toISOString(), end: weekAgo.toISOString() },
          periodB: { start: weekAgo.toISOString(), end: now.toISOString() },
        }),
      });
      const data = await res.json();
      setResult(data);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Compare Periods (§33, §75)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">So sánh: 2 tuần trước vs tuần gần nhất. Yêu cầu sessions comparable (§67 same skill/family/mode).</p>
          <Button onClick={runCompare} disabled={loading} size="sm">{loading ? "Đang so sánh..." : "Compare last 2 weeks"}</Button>
          {result && (
            <div className="rounded border p-2 text-sm space-y-1">
              <div>Status: <Badge variant={result.status === "improved" ? "default" : result.status === "declined" ? "destructive" : "secondary"}>{result.status}</Badge> • {result.evidence}</div>
              <div>Improved: {result.improved?.join(", ") || "—"}</div>
              <div>Declined: {result.declined?.join(", ") || "—"}</div>
              <div className="text-xs">Deltas: {Object.entries(result.deltas || {}).map(([k, v]) => `${k} ${(v as number) > 0 ? "+" : ""}${(v as number).toFixed(1)}`).join(" | ")}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
