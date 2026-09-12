'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <Card className="rounded-3xl border border-destructive/30 bg-card/90 paper-shadow overflow-hidden">
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Lỗi thực thi</span>
              <CardTitle className="font-serif text-xl font-bold text-foreground">
                Đã xảy ra sự cố không mong muốn
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl font-mono">
            {error.message || 'Hệ thống gặp gián đoạn tạm thời. Dữ liệu tiến độ học tập của bạn vẫn được lưu an toàn.'}
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={reset}
              className="bg-terracotta hover:bg-terracotta/90 text-white rounded-xl text-xs font-semibold h-9 px-4 gap-2 shadow-xs btn-spring"
            >
              <RotateCcw className="size-3.5" />
              <span>Thử kết nối lại</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
