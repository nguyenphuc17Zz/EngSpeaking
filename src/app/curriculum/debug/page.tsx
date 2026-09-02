"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLearnerState } from "@/lib/curriculum/learner-state-service";
import type { LearnerState } from "@/types/learner";

export default function CurriculumDebugPage() {
  const [state, setState] = useState<LearnerState | null>(null);
  const [changes, setChanges] = useState<unknown[]>([]);

  useEffect(() => {
    setState(loadLearnerState());
    try {
      const raw = localStorage.getItem("learner_state_changes");
      if (raw) setChanges(JSON.parse(raw));
    } catch {}
  }, []);

  if (!state) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-sm">Debug — chỉ dev (§109)</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <p>Version: {state.version} • Updated: {new Date(state.updatedAt).toLocaleString("vi-VN")}</p>
          <p>Focus: {state.curriculumState.currentFocus || "—"} • Successful: {state.curriculumState.consecutiveSuccessfulSessions} • Failed: {state.curriculumState.consecutiveFailedSessions}</p>
          <p>Recently completed: {state.curriculumState.recentlyCompletedSkills.join(", ") || "—"}</p>
          <p>Upcoming review: {state.curriculumState.upcomingReviewSkills.join(", ") || "—"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Learner State (compact)</CardTitle></CardHeader>
        <CardContent><pre className="text-xs overflow-auto max-h-[400px] bg-muted p-2 rounded">{JSON.stringify(state, null, 2)}</pre></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">State changes (§53, last 20)</CardTitle></CardHeader>
        <CardContent><pre className="text-xs overflow-auto max-h-[300px] bg-muted p-2 rounded">{JSON.stringify(changes.slice(-20), null, 2)}</pre></CardContent>
      </Card>
    </div>
  );
}
