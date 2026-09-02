"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WhyThisPanel({ explanation }: { explanation: string }) {
  return (
    <Card className="bg-amber-50/50 border-amber-200">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Why this practice? (§89)</CardTitle></CardHeader>
      <CardContent className="text-sm">{explanation}</CardContent>
    </Card>
  );
}
