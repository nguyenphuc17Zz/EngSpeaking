'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-destructive">Da xay ra loi</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{error.message || 'Vui long thu lai.'}</p>
          <Button onClick={reset}>Thu lai</Button>
        </CardContent>
      </Card>
    </div>
  );
}
