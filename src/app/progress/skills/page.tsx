"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function SkillsPage() {
  const [history, setHistory] = useState<Array<{ skill_id: string; mastery: number; captured_at: string }>>([]);
  useEffect(() => {
    fetch("/api/progress/skills?range=30d").then((r) => r.json()).then((d) => setHistory(d.history || [])).catch(() => {});
  }, []);
  const grouped = history.reduce((acc, h) => { (acc[h.skill_id] = acc[h.skill_id] || []).push(h); return acc; }, {} as Record<string, typeof history>);
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Skill Coverage (§44)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.keys(grouped).length ? Object.entries(grouped).map(([skill, pts]) => (
            <div key={skill} className="space-y-1">
              <div className="flex justify-between text-xs"><span>{skill}</span><Badge variant="outline">{pts.length} records • last {Math.round((pts[pts.length - 1]?.mastery || 0) * 100)}</Badge></div>
              <Progress value={Math.round((pts[pts.length - 1]?.mastery || 0) * 100)} />
            </div>
          )) : <p className="text-sm text-muted-foreground">Chưa có skill history — cần nhiều sessions.</p>}
        </CardContent>
      </Card>
      <Card className="bg-muted/30"><CardContent className="pt-3 text-xs text-muted-foreground">Skill History: mastery/confidence/retentionRisk/t rend tracked per skill (§7). Trend confidence low until 5 comparable sessions (§9-10).</CardContent></Card>
    </div>
  );
}
