"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Target,
  Clock,
  Zap,
  Loader2,
  ArrowLeft,
  Activity,
} from "lucide-react";

import { useErrorBankStore } from "@/stores/error-bank-store";
import { ErrorAnalyticsOverview } from "@/components/foundation/error-bank/ErrorAnalyticsOverview";
import { ErrorCard } from "@/components/foundation/error-bank/ErrorCard";
import { ErrorDetailModal } from "@/components/foundation/error-bank/ErrorDetailModal";
import { DiagnosticReportCard } from "@/components/foundation/error-bank/DiagnosticReportCard";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import type { MainErrorCategory, ErrorStatus } from "@/types/error-bank";

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

export default function ErrorBankDashboardPage() {
  const {
    records,
    selectedCategory,
    selectedStatus,
    searchQuery,
    selectedRecord,
    contextPack,
    diagnosticReport,
    isDiagnosing,
    loadLocalRecords,
    setCategory,
    setStatus,
    setSearchQuery,
    selectRecord,
    flagFalsePositive,
    generateDiagnosticReport,
  } = useErrorBankStore();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadLocalRecords();
  }, [loadLocalRecords]);

  const handleOpenDetail = (record: (typeof records)[0]) => {
    selectRecord(record);
    setIsDetailModalOpen(true);
  };

  // Filtered list
  const filteredRecords = records.filter((r) => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
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
              Bộ nhớ học tập dài hạn: Phân tích thói quen lỗi khẩu ngữ & chu trình ôn tập ngắt quãng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlobalAiSelector size="sm" />
          <Badge
            variant="outline"
            className="text-xs font-mono border-primary/30 text-primary"
          >
            Function 5 • Memory Layer
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
              Bạn có thể biết ngữ pháp trên giấy nhưng khi nói thì bị tắc nghẽn? AI sẽ quét toàn bộ {records.length} mẫu lỗi đã lưu, chỉ rõ thói quen dịch thô từ tiếng Việt và kê đơn 3 bài tập trọng tâm trong tuần.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => generateDiagnosticReport()}
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
                <span>Hàng đợi ôn tập ngắt quãng (Spaced Review Queue)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Có <b>{contextPack.reviewDueList.length} mẫu lỗi</b> đã đến hạn ôn tập để chuyển từ trí nhớ ngắn hạn sang dài hạn.
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

      {/* Error Cards Grid */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-border/80 text-center space-y-3 bg-card/40">
          <Brain className="size-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">Không tìm thấy mẫu lỗi phù hợp</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Thử thay đổi bộ lọc danh mục hoặc từ khóa tìm kiếm.
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
