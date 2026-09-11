"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Search,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  Loader2,
  ArrowLeft,
  Activity,
  Flame,
  Mic,
  MessageSquare,
  Repeat,
} from "lucide-react";

import { useErrorBankStore } from "@/stores/error-bank-store";
import { ErrorAnalyticsOverview } from "@/components/foundation/error-bank/ErrorAnalyticsOverview";
import { ErrorCard } from "@/components/foundation/error-bank/ErrorCard";
import { ErrorDetailModal } from "@/components/foundation/error-bank/ErrorDetailModal";
import { DiagnosticReportCard } from "@/components/foundation/error-bank/DiagnosticReportCard";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import type { MainErrorCategory, ErrorStatus, FossilizationLevel } from "@/types/error-bank";

const MAIN_CATEGORY_TABS: Array<{ id: MainErrorCategory | "all"; label: string }> = [
  { id: "all", label: "Tất cả mẫu lỗi" },
  { id: "grammar", label: "Ngữ pháp (Grammar)" },
  { id: "vocabulary", label: "Từ vựng (Vocabulary)" },
  { id: "pronunciation", label: "Phát âm (Pronunciation)" },
  { id: "fluency", label: "Trôi chảy & Phản xạ (Fluency)" },
];

const STATUS_FILTERS: Array<{ id: ErrorStatus | "all"; label: string }> = [
  { id: "all", label: "Tất cả trạng thái" },
  { id: "active", label: "Đang gặp" },
  { id: "persistent", label: "Tái phát nhiều" },
  { id: "recovering", label: "Đang phục hồi" },
  { id: "mastered", label: "Đã làm chủ" },
];

const FOSSILIZATION_FILTERS: Array<{ id: FossilizationLevel | "all"; label: string }> = [
  { id: "all", label: "Tất cả nguy cơ" },
  { id: "fossilized", label: "🔥 Nguy cơ hóa đá (>65%)" },
  { id: "habitual", label: "🟡 Thói quen (35-65%)" },
  { id: "emerging", label: "🟢 Mới chớm (<35%)" },
];

export default function ErrorBankDashboardPage() {
  const {
    records,
    selectedCategory,
    selectedStatus,
    selectedFossilization,
    dueFilter,
    searchQuery,
    selectedRecord,
    contextPack,
    diagnosticReport,
    isDiagnosing,
    loadLocalRecords,
    setCategory,
    setStatus,
    setFossilization,
    setDueFilter,
    setSearchQuery,
    selectRecord,
    flagFalsePositive,
    generateDiagnosticReport,
  } = useErrorBankStore();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  useEffect(() => {
    loadLocalRecords();
  }, [loadLocalRecords]);

  const handleOpenDetail = (record: (typeof records)[0]) => {
    selectRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleRunDiagnostic = async () => {
    setDiagError(null);
    try {
      await generateDiagnosticReport();
    } catch (e: unknown) {
      setDiagError(e instanceof Error ? e.message : String(e));
    }
  };

  // Filtered list
  const now = Date.now();
  const filteredRecords = records.filter((r) => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    if (selectedFossilization !== "all" && r.fossilizationLevel !== selectedFossilization) return false;
    if (dueFilter === "due_today") {
      const isDue = r.nextReviewDueAt && new Date(r.nextReviewDueAt).getTime() <= now;
      const isLowR = (r.retrievability || 100) < 90;
      if (!isDue && !isLowR) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = r.labelVi.toLowerCase().includes(q);
      const matchCanon = r.canonicalName.toLowerCase().includes(q);
      const matchDesc = r.descriptionVi.toLowerCase().includes(q);
      if (!matchLabel && !matchCanon && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 animate-in fade-in-0 duration-300 max-w-5xl mx-auto px-2 sm:px-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <Link href="/foundation">
            <Button variant="ghost" size="sm" className="size-9 p-0 rounded-full">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              <span>Personal Error Bank & Spoken Memory</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Hệ thống trí nhớ dài hạn: FSRS Spaced Repetition, Bayesian Knowledge Tracing & Bản đồ Hóa đá L1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlobalAiSelector size="sm" />
          <Badge
            variant="outline"
            className="text-xs font-mono border-primary/30 text-primary"
          >
            FSRS • BKT • L1 Fossilization
          </Badge>
        </div>
      </div>

      {/* Hero Banner with AI Doctor Diagnostic Trigger */}
      <div className="p-6 md:p-8 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold w-fit">
              <Activity className="size-3.5" />
              <span>AI Bác Sĩ Khẩu Ngữ (Spoken Pathologist)</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Chẩn đoán nguyên nhân gốc rễ: Retrieval Gap vs Knowledge Gap
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Bạn biết ngữ pháp trên giấy nhưng khi nói thì bị tắc nghẽn? AI kết hợp Bayesian Knowledge Tracing và ma trận chuyển di tiếng mẹ đẻ để tách biệt lỗi do kiến thức với phản xạ nói chậm, kê đơn 3 bài tập trọng tâm trong tuần.
            </p>
            {diagError && (
              <p className="text-xs text-red-500 font-medium">⚠️ {diagError}</p>
            )}
          </div>

          <Button
            size="lg"
            onClick={handleRunDiagnostic}
            disabled={isDiagnosing}
            className="rounded-2xl font-bold text-xs sm:text-sm h-12 px-6 gap-2 btn-spring shadow-md shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto"
          >
            {isDiagnosing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>AI đang chẩn đoán...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>{diagnosticReport ? "Cập nhật Chẩn Đoán AI" : "🩺 Nhận Chẩn Đoán Khẩu Ngữ"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Render AI Diagnostic Report Card if generated */}
      {diagnosticReport && (
        <DiagnosticReportCard report={diagnosticReport} />
      )}

      {/* 4 KPI Cards Overview */}
      <ErrorAnalyticsOverview records={records} contextPack={contextPack} />

      {/* Spaced Review Callout Banner if there are due reviews */}
      {contextPack.reviewDueList.length > 0 && (
        <Card className="rounded-3xl border-2 border-indigo-500/40 bg-gradient-to-br from-card via-card to-indigo-500/10 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                <Clock className="size-4" />
                <span>FSRS Hàng đợi ôn tập ngắt quãng (Spaced Review Queue)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Có <b>{contextPack.reviewDueList.length} mẫu lỗi</b> đã suy giảm Retrievability dưới 90%, cần ôn tập ngay để tránh rơi rụng trí nhớ!
              </p>
            </div>

            <Link href="/foundation/retry-lab">
              <Button
                size="sm"
                className="rounded-2xl font-bold text-xs gap-1.5 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white btn-spring shadow-xs"
              >
                <RotateCcw className="size-3.5" />
                <span>Luyện sửa lỗi đến hạn</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Category Tabs, Status Filter, and Search Bar */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
          {MAIN_CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(tab.id)}
                className={`rounded-full text-xs font-semibold h-8 px-3.5 ${
                  isActive ? "shadow-xs" : "border-border/80 text-muted-foreground"
                }`}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Fossilization & Due Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Flame className="size-3 text-rose-500" /> Hóa đá:
            </span>
            {FOSSILIZATION_FILTERS.map((f) => {
              const isActive = selectedFossilization === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFossilization(f.id)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    isActive
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setDueFilter(dueFilter === "all" ? "due_today" : "all")}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
              dueFilter === "due_today"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "border-border/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-3.5" />
            <span>Chỉ xem cần ôn FSRS ({contextPack.reviewDueList.length})</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm mẫu lỗi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-2xl text-xs bg-card border-border/80"
            />
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {STATUS_FILTERS.map((st) => {
              const isActive = selectedStatus === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatus(st.id)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    isActive
                      ? "bg-muted text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State when Error Bank is empty (No mock data) */}
      {records.length === 0 ? (
        <div className="p-10 md:p-14 rounded-3xl border border-dashed border-border/80 text-center space-y-5 bg-card/40 max-w-2xl mx-auto">
          <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
            <Brain className="size-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Ngân hàng Lỗi Cá nhân chưa có dữ liệu</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Hệ thống hoạt động với dữ liệu thực tế 100%. Khi bạn thực hành phát âm và nói câu ở bất kỳ phòng tập nào dưới đây, mọi lỗi ngữ pháp, phát âm và ngắc ngứ sẽ tự động được ghi nhận và đưa vào thuật toán FSRS & Bayesian Knowledge Tracing:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            <Link href="/foundation/sentence-builder">
              <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs font-semibold h-10 gap-1.5 border-border/80 hover:border-primary/50">
                <Mic className="size-3.5 text-primary" />
                <span>Sentence Builder</span>
              </Button>
            </Link>
            <Link href="/foundation/vn-to-en">
              <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs font-semibold h-10 gap-1.5 border-border/80 hover:border-emerald-500/50">
                <Repeat className="size-3.5 text-emerald-500" />
                <span>VN → EN Speaking</span>
              </Button>
            </Link>
            <Link href="/conversation">
              <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs font-semibold h-10 gap-1.5 border-border/80 hover:border-violet-500/50">
                <MessageSquare className="size-3.5 text-violet-500" />
                <span>Hội thoại AI tự do</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-border/80 text-center space-y-3 bg-card/40">
          <Brain className="size-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">Không tìm thấy mẫu lỗi phù hợp</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Thử thay đổi bộ lọc danh mục, mức độ hóa đá hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((rec) => (
            <ErrorCard
              key={rec.id}
              record={rec}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <ErrorDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onFlagFalsePositive={(id) => {
          flagFalsePositive(id);
          setIsDetailModalOpen(false);
        }}
      />
    </div>
  );
}
