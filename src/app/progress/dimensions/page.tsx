"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const DIMS = ["fluency","grammar","vocabulary","naturalness","responseSpeed","pronunciation","communication","confidence"];

export default function DimensionsPage() {
  const [metric, setMetric] = useState("overall");
  const [data, setData] = useState<Array<{ captured_at: string; overall: number; dimensions: Record<string,number> }>>([]);

  useEffect(() => {
    fetch("/api/progress/history?limit=50").then((r) => r.json()).then((d) => setData((d.history || []).reverse())).catch(() => {});
  }, []);

  const chartData = data.map((d) => ({
    date: new Date(d.captured_at).toLocaleDateString("vi-VN", { month: "short", day: "numeric" }),
    value: metric === "overall" ? d.overall : (d.dimensions?.[metric] ?? d.overall),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Metric:</Label>
        <Select value={metric} onValueChange={(v: string | null) => v && setMetric(v)}>
          <SelectTrigger className="w-[160px]"><span>{metric}</span></SelectTrigger>
          <SelectContent><SelectItem value="overall">Overall</SelectItem>{DIMS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Dimension History (§6)</CardTitle><CardDescription className="text-xs">30d default, raw vs smoothed available in overview</CardDescription></CardHeader>
        <CardContent>
          {chartData.length < 2 ? <p className="text-sm text-muted-foreground">Not enough data (§70 Early signal)</p> : (
            <ChartContainer>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0,100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="var(--chart-1)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
