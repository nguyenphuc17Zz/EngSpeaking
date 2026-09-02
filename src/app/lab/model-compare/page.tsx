"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function ModelCompareLab() {
  const [input, setInput] = useState("Say hello and ask about the weekend.");
  const [gemini, setGemini] = useState<Record<string, unknown> | null>(null);
  const [groq, setGroq] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const runOne = async (provider: string) => {
        const start = Date.now();
        const res = await fetch("/api/ai/orchestrate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: "general", input: { text: input }, mode: "manual", providerId: provider, modelId: "auto" }) });
        const data = await res.json();
        return { ...data, wallLatency: Date.now() - start };
      };
      const [g, q] = await Promise.all([runOne("gemini"), runOne("groq")]);
      setGemini(g);
      setGroq(q);
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Model Evaluation Lab (§56)</h1><p className="text-sm text-muted-foreground">Cùng task/input — so sánh Gemini vs Groq: latency/output/tokens/validation.</p></div>
      <Card><CardHeader><CardTitle className="text-base">Input</CardTitle></CardHeader><CardContent className="space-y-2"><Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} /><Button onClick={run} disabled={loading}>Run comparison</Button></CardContent></Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Gemini</CardTitle><CardDescription>latency/output/tokens</CardDescription></CardHeader><CardContent className="text-sm">{gemini ? <pre className="text-xs overflow-auto bg-muted p-2 rounded">{JSON.stringify(gemini, null, 2)}</pre> : "—"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Groq</CardTitle><CardDescription>latency/output/tokens</CardDescription></CardHeader><CardContent className="text-sm">{groq ? <pre className="text-xs overflow-auto bg-muted p-2 rounded">{JSON.stringify(groq, null, 2)}</pre> : "—"}</CardContent></Card>
      </div>
      <Card className="bg-muted/40"><CardContent className="pt-3 text-xs text-muted-foreground">Dev tool — không dùng trong user flow chính. Đánh giá latency/validation để cải thiện routing.</CardContent></Card>
    </div>
  );
}
