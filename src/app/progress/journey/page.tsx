"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function JourneyPage() {
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; description: string; achieved_at: string; significance: string }>>([]);
  useEffect(() => {
    fetch("/api/progress/milestones").then((r) => r.json()).then((d) => setMilestones(d.milestones || [])).catch(() => {});
  }, []);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Speaking Journey (§73)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {milestones.length ? (
            <div className="relative border-l pl-4 space-y-4">
              {milestones.map((m) => (
                <div key={m.id} className="relative">
                  <div className="absolute -left-[21px] top-1 size-3 rounded-full bg-primary" />
                  <div className="rounded border p-2">
                    <div className="font-medium text-sm flex items-center gap-2">{m.title} <Badge variant={m.significance === "major" ? "default" : "secondary"} className="text-xs">{m.significance}</Badge></div>
                    <div className="text-xs text-muted-foreground">{m.description} • {new Date(m.achieved_at).toLocaleDateString("vi-VN")}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">Chưa có milestone — tiếp tục luyện để đạt first_30s, first_1min, streak 5, mastery 70% (§29-31).</p>}
        </CardContent>
      </Card>
    </div>
  );
}
