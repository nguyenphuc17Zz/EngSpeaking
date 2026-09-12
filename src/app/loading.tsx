import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 space-y-6">
      <div className="h-10 w-64 bg-muted/60 animate-pulse rounded-2xl" />
      <Card className="rounded-3xl border border-border/80 bg-card/90 paper-shadow">
        <CardContent className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="size-12 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <p className="font-serif text-base font-medium text-foreground">
            Đang tải dữ liệu học tập...
          </p>
          <p className="text-xs text-muted-foreground">
            Chuẩn bị giáo trình và khởi tạo phòng thực hành
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
