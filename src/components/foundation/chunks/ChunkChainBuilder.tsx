"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Sparkles,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Volume2,
  CheckCircle2,
  Target,
} from "lucide-react";
import type { ChunkChainTask } from "@/types/chunk-automaticity";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface ChunkChainBuilderProps {
  task: ChunkChainTask;
  isRecording: boolean;
}

export function ChunkChainBuilder({ task, isRecording }: ChunkChainBuilderProps) {
  const tts = useBrowserTTS();
  const [activeBlocks, setActiveBlocks] = useState<Record<number, string>>({
    0: task.blocks[0]?.suggestedChunk || "",
    1: task.blocks[1]?.suggestedChunk || "",
    2: task.blocks[2]?.suggestedChunk || "",
    3: task.blocks[3]?.suggestedChunk || "",
  });

  const blockColors = [
    { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
    { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
    { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
    { border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  ];

  return (
    <Card className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Header: Title, Strategy Badge, Topic */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-mono text-xs font-bold gap-1 px-3 py-1 rounded-full">
              <Layers className="size-3.5" />
              <span>Speech Chain Builder (4 Khối ghép)</span>
            </Badge>

            {task.strategyTitleVi && (
              <Badge variant="secondary" className="text-xs font-semibold bg-primary/15 text-primary border border-primary/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Target className="size-3" />
                <span>{task.strategyTitleVi}</span>
              </Badge>
            )}
          </div>

          <Badge variant="outline" className="text-xs font-mono text-muted-foreground border-border/80">
            Chủ đề: <span className="text-foreground font-bold ml-1">{task.topic}</span>
          </Badge>
        </div>

        {/* Persona & Communicative Context */}
        {task.persona && (
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="font-bold text-primary shrink-0">Bối cảnh giao tiếp:</span>
            <span className="italic text-foreground">{task.persona}</span>
          </div>
        )}

        {/* Situation & Target Question */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{task.situationVi}</p>
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              "{task.targetQuestion}"
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tts.speak(task.targetQuestion)}
              className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Volume2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* 4 Interactive Blocks Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="size-3.5 text-primary" />
              <span>Lắp ghép 4 khối khẩu ngữ thành 1 chuỗi hoàn chỉnh:</span>
            </span>
            <span className="text-[11px] text-muted-foreground italic hidden sm:inline">
              (Bấm vào các nút nhỏ để đổi biến thể khẩu ngữ)
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {task.blocks.map((block, i) => {
              const theme = blockColors[i % blockColors.length];
              const currentChunk = activeBlocks[i] || block.suggestedChunk;

              return (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border-2 ${theme.border} ${theme.bg} flex flex-col justify-between space-y-2.5 transition-all shadow-xs relative`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.text}`}>
                        {block.labelVi}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">Khối {i + 1}</span>
                    </div>

                    {block.rhetoricalRole && (
                      <p className="text-[10px] text-muted-foreground italic line-clamp-1">
                        {block.rhetoricalRole}
                      </p>
                    )}
                  </div>

                  <p className="font-mono text-sm font-bold text-foreground leading-snug my-1">
                    "{currentChunk}"
                  </p>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    {block.transitionConnector && (
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        Từ nối: <span className="font-semibold text-foreground">{block.transitionConnector}</span>
                      </span>
                    )}

                    {/* Alternative chunk pills */}
                    {block.alternativeChunks.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {block.alternativeChunks.slice(0, 2).map((alt, altIdx) => (
                          <button
                            key={altIdx}
                            onClick={() => setActiveBlocks((prev) => ({ ...prev, [i]: alt }))}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-card/80 border border-border/60 hover:bg-card text-muted-foreground transition-colors"
                          >
                            {alt.slice(0, 18)}...
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expected Assembly Preview */}
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-primary block">Mẫu câu lắp ghép hoàn chỉnh:</span>
            <p className="text-muted-foreground font-mono text-[11px] italic">
              "{task.expectedAssemblyExample}"
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => tts.speak(task.expectedAssemblyExample)}
            className="text-primary hover:bg-primary/20 gap-1.5 h-8 px-3 rounded-xl shrink-0 font-medium"
          >
            <Volume2 className="size-3.5" />
            <span>Nghe mẫu</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
