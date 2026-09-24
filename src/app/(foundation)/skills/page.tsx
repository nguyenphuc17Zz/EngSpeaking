"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SKILL_TAXONOMY } from "@/lib/foundation/skills/taxonomy";
import { getSkillProgress } from "@/lib/foundation/services/progress.service";
import { useEffect, useState } from "react";

export default function SkillsPage() {
  const [progress, setProgress] = useState<Record<string, { value: number; history: number[] }>>({});

  useEffect(() => {
    const m: Record<string, { value: number; history: number[] }> = {};
    for (const s of SKILL_TAXONOMY) m[s.skill] = getSkillProgress(s.skill);
    setProgress(m);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Kỹ năng Foundation (§5)</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {SKILL_TAXONOMY.map((s) => {
            const p = progress[s.skill];
            return (
              <div key={s.skill} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.labelVi}</span>
                  <Badge variant="outline" className="text-[11px]">Lv {s.levelRange[0]}-{s.levelRange[1]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
                <div className="flex flex-wrap gap-1">
                  {s.defaultTypes.map((t) => <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>)}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Tiến trình</span><span className="font-mono">{p?.value ?? "—"}</span></div>
                  <Progress value={p?.value ?? 0} />
                  {p?.history?.length ? <p className="text-[11px] text-muted-foreground">Lịch sử: {p.history.slice(-5).join(" → ")}</p> : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
