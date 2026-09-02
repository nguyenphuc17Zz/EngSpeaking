"use client";
import type { FoundationExercise } from "@/types/foundation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillBadge } from "./SkillBadge";
import { getDifficultyLabel } from "@/lib/foundation/difficulty/model";

export function ExerciseCard({ exercise }: { exercise: FoundationExercise }) {
  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <SkillBadge skill={exercise.skill} />
          <Badge variant="outline" className="text-xs">{exercise.type}</Badge>
          <Badge variant="outline" className="text-xs">Lv {exercise.level} • {getDifficultyLabel(exercise.difficulty)} ({exercise.difficulty}/10)</Badge>
          {exercise.source && <Badge variant="secondary" className="text-[11px]">{exercise.source}</Badge>}
        </div>
        <CardTitle className="text-base leading-snug">{exercise.instruction}</CardTitle>
        {exercise.topic && <CardDescription className="text-xs">Chủ đề: {exercise.topic}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {exercise.prompt && <div className="rounded-xl bg-muted/60 p-3 leading-relaxed"><span className="text-xs text-muted-foreground">Prompt:</span> <span className="font-medium">{exercise.prompt}</span></div>}
        {exercise.targetPhrase && <div className="text-sm"><span className="text-xs text-muted-foreground">Target chunk: </span><span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{exercise.targetPhrase}</span></div>}
        {exercise.targetPattern && <div className="text-sm"><span className="text-xs text-muted-foreground">Pattern: </span><span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{exercise.targetPattern}</span></div>}
        {exercise.constraints?.length ? (
          <ul className="list-disc ml-5 text-xs text-muted-foreground space-y-0.5">
            {exercise.constraints.map((c, i) => <li key={i}><span className="font-medium">{c.type}:</span> {c.instruction} {c.target ? `(${c.target})` : ""}</li>)}
          </ul>
        ) : null}
        {exercise.expectedDurationSec && <p className="text-xs text-muted-foreground">Thời lượng gợi ý: {exercise.expectedDurationSec}s</p>}
      </CardContent>
    </Card>
  );
}
