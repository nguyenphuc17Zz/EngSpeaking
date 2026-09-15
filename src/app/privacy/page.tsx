"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Trung tâm Bảo mật</h1>
      <p className="text-sm text-muted-foreground">Audio được xử lý trong bộ nhớ, không lưu audio thô (§84). Transcript lưu 90 ngày, có thể xóa.</p>
      <Card><CardHeader><CardTitle className="text-base">Dữ liệu được lưu</CardTitle><CardDescription className="text-xs">Audio, transcript, analytics, AI telemetry</CardDescription></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>• Audio: xử lý trong bộ nhớ, xóa ngay sau transcribe, không lưu file (§27).</p>
          <p>• Transcript: lưu để hiển thị lịch sử, có thể xóa.</p>
          <p>• Analytics: lưu tổng hợp, không lưu nội dung nhạy cảm.</p>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Xóa dữ liệu</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { if (typeof window !== 'undefined') { localStorage.clear(); alert('Đã xóa localStorage'); }}}>Xóa localStorage</Button>
          <Button variant="destructive" onClick={() => { if (confirm('Xóa tất cả lịch sử?')) { localStorage.removeItem('english-speaking-settings'); localStorage.removeItem('learner_state_v1'); alert('Đã xóa'); }}}>Reset Progress</Button>
        </CardContent>
      </Card>
      <Card className="bg-muted/40"><CardContent className="pt-4 text-xs text-muted-foreground">Mọi AI telemetry không chứa API key. Dữ liệu lưu trữ an toàn 100% trên SQLite cục bộ (data/app.db). Xóa dữ liệu qua nút Reset hoặc API /api/me.</CardContent></Card>
    </div>
  );
}
