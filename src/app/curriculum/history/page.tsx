"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CurriculumHistoryPage() {
  const [plans, setPlans] = useState<Array<{ id: string; title: string; objective: string; estimated_duration_minutes: number; primary_skill: string; generated_at: string }>>([]);

  useEffect(() => {
    fetch("/api/curriculum/history?limit=20").then((r) => r.json()).then((d) => setPlans(d.plans || [])).catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Plan History (§114)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {plans.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có plan nào được lưu trong database SQLite cục bộ.</p> : (
          plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded border p-3">
              <div className="text-sm">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.objective} • {p.estimated_duration_minutes} min • {p.primary_skill}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.generated_at).toLocaleString("vi-VN")}</div>
              </div>
              <Badge variant="outline">{p.id.slice(0, 6)}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
