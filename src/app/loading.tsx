import { Card, CardContent } from "@/components/ui/card";
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-4">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <Card><CardContent className="py-8"><div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto" /><p className="text-center text-sm text-muted-foreground mt-2">Dang tai...</p></CardContent></Card>
    </div>
  );
}
