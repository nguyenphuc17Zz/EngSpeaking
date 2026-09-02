"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import {
  Layers,
  Plus,
  Sparkles,
  BookOpen,
  Clock,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import type { ChunkRecord } from "@/types/chunk-automaticity";

interface MyChunksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  library: ChunkRecord[];
  onSaveCustomChunk: (chunk: string, meaning: string) => void;
  onSelectChunkForPractice?: (chunk: ChunkRecord) => void;
}

export function MyChunksDrawer({
  isOpen,
  onClose,
  library,
  onSaveCustomChunk,
  onSelectChunkForPractice,
}: MyChunksDrawerProps) {
  const [newChunkText, setNewChunkText] = useState("");
  const [newMeaningText, setNewMeaningText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newChunkText.trim() || !newMeaningText.trim()) {
      toast.error("Vui lòng điền đủ thông tin", "Cần nhập cụm tiếng Anh và ý nghĩa tiếng Việt.");
      return;
    }

    onSaveCustomChunk(newChunkText.trim(), newMeaningText.trim());
    toast.success("Đã thêm cụm mới", `Đã lưu "${newChunkText}" vào kho My Chunks.`);
    setNewChunkText("");
    setNewMeaningText("");
    setIsAdding(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              <span>Kho cụm khẩu ngữ (My Chunks Library)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Tổng cộng {library.length} khối khẩu ngữ sẵn sàng lắp ráp vào câu nói.
            </DialogDescription>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAdding((prev) => !prev)}
            className="rounded-2xl text-xs font-bold gap-1.5 h-8 px-3.5 btn-spring"
          >
            <Plus className="size-3.5" />
            <span>Thêm cụm mới</span>
          </Button>
        </div>

        {/* Add New Chunk Form */}
        {isAdding && (
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 animate-in fade-in-0 duration-200">
            <span className="text-xs font-bold text-foreground block">Thêm cụm khẩu ngữ tự chọn:</span>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <Input
                placeholder="Ví dụ: It turns out that..."
                value={newChunkText}
                onChange={(e) => setNewChunkText(e.target.value)}
                className="h-9 text-xs rounded-xl bg-card font-mono"
              />
              <Input
                placeholder="Ý nghĩa tiếng Việt: Hóa ra là..."
                value={newMeaningText}
                onChange={(e) => setNewMeaningText(e.target.value)}
                className="h-9 text-xs rounded-xl bg-card"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="text-xs">
                Hủy
              </Button>
              <Button size="sm" onClick={handleAdd} className="text-xs font-bold rounded-xl px-4">
                Lưu vào kho
              </Button>
            </div>
          </div>
        )}

        {/* Chunks List */}
        <div className="space-y-3">
          {library.map((chunk) => (
            <div
              key={chunk.id}
              className="p-4 rounded-2xl bg-muted/20 border border-border/60 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    "{chunk.canonicalChunk}"
                  </span>
                  {chunk.isCustomUserChunk && (
                    <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                      Tự tạo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{chunk.meaningVi}</p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground pt-1">
                  <span>Thành thạo: <b className="text-foreground">{chunk.masteryScore}%</b></span>
                  <span>Độ trễ: <b className="text-foreground">{(chunk.retrievalLatencyMs / 1000).toFixed(1)}s</b></span>
                </div>
              </div>

              {onSelectChunkForPractice && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onSelectChunkForPractice(chunk);
                    onClose();
                  }}
                  className="rounded-xl text-xs font-semibold h-8 border-border/80 shrink-0"
                >
                  Luyện cụm này
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
