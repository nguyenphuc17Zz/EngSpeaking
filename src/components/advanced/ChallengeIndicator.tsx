"use client";
import { Badge } from "@/components/ui/badge";
export function ChallengeIndicator({ challenge }: { challenge: { type: string; effect: string } }) {
  return <Badge variant="destructive" className="animate-pulse">{challenge.type}: {challenge.effect}</Badge>;
}
