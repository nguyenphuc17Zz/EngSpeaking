"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function parseBlueprint(raw: unknown): { topic?: string; setting?: string; userGoal?: string; character?: { role?: string } } {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw as { topic?: string; setting?: string; userGoal?: string; character?: { role?: string } };
}

export default function ConversationHistoryPage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<Array<{ id: string; mode: string; scenario_blueprint: { topic?: string; setting?: string; userGoal?: string; character?: { role?: string } } | string; created_at: string }>>([]);

  useEffect(() => {
    fetch("/api/conversation/worlds?limit=20").then((r) => r.json()).then((d) => setWorlds(d.worlds || [])).catch(() => {});
  }, []);

  const handleResume = async (id: string) => {
    if (typeof window !== "undefined") localStorage.setItem("conversation_world_id", id);
    try {
      const res = await fetch(`/api/conversation/worlds?id=${id}`);
      const data = await res.json();
      if (data.world) {
        const bp = parseBlueprint(data.world.scenario_blueprint);
        const { useConversationStore } = await import("@/stores/conversation-store");
        const worldState = {
          scenario: bp,
          currentObjective: bp.userGoal || bp.topic,
          currentTopic: bp.topic,
          activeCharacter: { mood: "neutral", trust: 60, patience: 70, engagement: 65, role: bp.character?.role },
          conversationFacts: (data.facts || []).map((f: { id: string; fact: string }) => ({ id: f.id, fact: f.fact, createdAt: new Date().toISOString() })),
          unresolvedThreads: [],
          activeEvents: [],
          turnCount: (data.turns || []).length,
          surpriseLevel: "medium" as const,
          pressure: "normal" as const,
        };
        useConversationStore.getState().setWorld(worldState as unknown as import("@/types/conversation-world").ConversationWorldState);
        useConversationStore.getState().setTurns((data.turns || []).map((t: { id: string; role: string; text: string; timestamp: string }) => ({ id: t.id, role: t.role, text: t.text, timestamp: t.timestamp })));
      }
    } catch {}
    router.push(`/conversation/session/${id}`);
  };

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-base">Lịch sử Conversation Worlds</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {worlds.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có world nào.</p> : (
            worlds.map((w) => {
              const bp = parseBlueprint(w.scenario_blueprint);
              return (
                <div key={w.id} className="flex items-center justify-between rounded border p-3">
                  <div className="text-sm">
                    <div className="font-medium">{bp.topic || w.mode} — {bp.setting}</div>
                    <div className="text-xs text-muted-foreground">{bp.character?.role} • {w.mode} • {new Date(w.created_at).toLocaleString("vi-VN")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{w.mode}</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleResume(w.id)}>Tiếp tục (Resume §59)</Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
