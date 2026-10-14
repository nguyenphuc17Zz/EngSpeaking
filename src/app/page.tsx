"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MessageSquareText,
  Zap,
  Settings,
  ArrowRight,
  Target,
  ShieldCheck,
  Radio,
  LifeBuoy,
  RotateCcw,
  Layers,
  BookOpen,
  Copy,
  Check,
  Play,
  Activity,
  Terminal,
  ScanLine,
} from "lucide-react";
import {
  useUiStore,
  INDUSTRIAL_THEMES,
} from "@/stores/ui-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/lib/toast";

interface CommandPreset {
  id: string;
  tabLabel: string;
  command: string;
  href: string;
  studioName: string;
  targetTtfw: string;
}

const COMMAND_PRESETS: CommandPreset[] = [
  {
    id: "shadow",
    tabLabel: "01.SHADOW",
    command: "speak run --studio=shadowing --sync=ipa-prosody --speed=1.0x",
    href: "/shadowing",
    studioName: "Corodomo Shadowing Studio",
    targetTtfw: "0.45s SYNC",
  },
  {
    id: "sentence",
    tabLabel: "02.SENTENCE",
    command: "speak run --studio=sentence-builder --tiers=A,B,C --bank=70/30",
    href: "/sentence-builder",
    studioName: "Sentence Builder Lab",
    targetTtfw: "1.20s TTFW",
  },
  {
    id: "roleplay",
    tabLabel: "03.ROLEPLAY",
    command: "speak run --studio=conversation --world=stateful --twists=on",
    href: "/conversation",
    studioName: "AI Roleplay Worlds",
    targetTtfw: "1.40s TURN",
  },
  {
    id: "toulmin",
    tabLabel: "04.TOULMIN",
    command: "speak run --studio=advanced --framework=toulmin --pressure=high",
    href: "/advanced",
    studioName: "Toulmin Debate & Blitz",
    targetTtfw: "1.50s CLAIM",
  },
  {
    id: "vocab",
    tabLabel: "05.VOCAB",
    command: "speak run --studio=vocabulary --lexicon=oxford-5000 --stress=strict",
    href: "/vocabulary",
    studioName: "Spoken Vocabulary Gym",
    targetTtfw: "0.80s IPA",
  },
];

export default function Home() {
  const router = useRouter();
  const industrialTheme = useUiStore((s) => s.industrialTheme);
  const setIndustrialTheme = useUiStore((s) => s.setIndustrialTheme);
  const xrayMode = useUiStore((s) => s.xrayMode);
  const toggleXrayMode = useUiStore((s) => s.toggleXrayMode);

  const activeProvider = useSettingsStore((s) => s.activeProvider || "gemini");
  const activeModel = useSettingsStore((s) =>
    (s.activeProvider || "gemini") === "gemini"
      ? s.preferredGeminiModel || "gemini-2.5-flash"
      : s.preferredGroqModel || "openai/gpt-oss-120b"
  );
  const sttProvider = useSettingsStore((s) => s.stt?.provider || "whisper-local");
  const ttsProvider = useSettingsStore((s) => s.tts?.provider || "edge-tts");

  const [selectedCmdIdx, setSelectedCmdIdx] = useState(0);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [consoleTab, setConsoleTab] = useState<"scope" | "matrix" | "radar" | "telemetry">("scope");
  const [pulseBoost, setPulseBoost] = useState(1);

  // Live Subsystem Circuit Breakers
  const [breakers, setBreakers] = useState({
    AUTO_START_MIC: true,
    FAST_PASS_EVAL: true,
    SMART_VAD_SHIELD: true,
  });

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[11:20:01] KERNEL_INIT // SQLite-WAL 70/30 Content Bank mounted (0.4ms)",
    "[11:20:02] AUDIO_IO   // Pre-warmed acoustic pipeline ready (48kHz PCM)",
    "[11:20:04] FAST_PASS  // Levenshtein + Token Overlap gate armed (<2ms)",
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCmd = COMMAND_PRESETS[selectedCmdIdx] || COMMAND_PRESETS[0];

  // Oscilloscope 60fps waveform animation
  useEffect(() => {
    if (consoleTab !== "scope") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Subtle scope graticule grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center zero-crossing reference line
      ctx.strokeStyle = "rgba(204, 255, 0, 0.22)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Trace 1: NATIVE_TARGET Reference Envelope (Acid Lime / Green)
      ctx.strokeStyle = "#CCFF00";
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const env = Math.sin((x / w) * Math.PI);
        const y =
          h / 2 +
          Math.sin(x * 0.045 - phase * 0.9) * 22 * env +
          Math.cos(x * 0.11 + phase * 0.5) * 9 * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Trace 2: USER_PROSODY Live Signal (Safety Orange)
      ctx.strokeStyle = "#FF5500";
      ctx.lineWidth = 2.25;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const env = Math.sin((x / w) * Math.PI) * pulseBoost;
        const y =
          h / 2 +
          Math.sin(x * 0.045 - phase * 0.9 + 0.18) * 20 * env +
          Math.sin(x * 0.16 - phase * 1.4) * 7 * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.065;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [consoleTab, pulseBoost]);

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(activeCmd.command);
      setCopiedCmd(true);
      toast.success("Đã sao chép lệnh khởi chạy", activeCmd.command);
      setTimeout(() => setCopiedCmd(false), 1500);
    } catch {
      toast.info("Lệnh Studio", activeCmd.command);
    }
  };

  const handleToggleBreaker = (key: keyof typeof breakers) => {
    setBreakers((prev) => {
      const nextVal = !prev[key];
      const now = new Date().toLocaleTimeString("vi-VN", { hour12: false });
      setConsoleLogs((logs) => [
        ...logs.slice(-3),
        `[${now}] BREAKER    // ${key} -> ${nextVal ? "CLOSED (ACTIVE)" : "TRIPPED (BYPASS)"}`,
      ]);
      return { ...prev, [key]: nextVal };
    });
  };

  const handleTriggerPulse = () => {
    setPulseBoost(1.55);
    const now = new Date().toLocaleTimeString("vi-VN", { hour12: false });
    setConsoleLogs((logs) => [
      ...logs.slice(-3),
      `[${now}] PROSODY_OK // Pitch lock 97.8% | TTFW 1.09s | Fast-Pass HIT`,
    ]);
    setTimeout(() => setPulseBoost(1), 900);
  };

  const foundationStudios = [
    {
      code: "LAB-01",
      title: "Sentence Builder",
      desc: "Ráp câu phản xạ 3 tầng: Khung ngữ pháp, từ vựng theo chủ đề & âm thanh chuẩn",
      href: "/sentence-builder",
      icon: Layers,
      badge: "SB CORE",
      spec: "TTFW < 1.5s • 3 TIERS",
    },
    {
      code: "LAB-02",
      title: "VN → EN Speaking",
      desc: "Truy xuất trực tiếp từ ý niệm tiếng Việt sang phản xạ tiếng Anh, loại bỏ dịch nhẩm",
      href: "/vn-to-en",
      icon: Target,
      badge: "DIRECT THINKING",
      spec: "NO TRANSLATION • B1-C1",
    },
    {
      code: "LAB-03",
      title: "Corodomo Shadowing",
      desc: "Nhại âm song song đa tốc độ, rèn nhịp điệu và ngữ điệu tự nhiên như người bản xứ",
      href: "/shadowing",
      icon: Radio,
      badge: "ACOUSTIC SYNC",
      spec: "IPA + YOUTUBE • 0.6x-1.25x",
    },
    {
      code: "LAB-04",
      title: "Spoken Vocabulary",
      desc: "Quy trình 2 bước Oxford-5000: Trọng âm IPA chuẩn xác & kích hoạt từ trong câu ngữ cảnh",
      href: "/vocabulary",
      icon: BookOpen,
      badge: "OXFORD-5000",
      spec: "PHONEME STRESS • 2-STEP",
    },
    {
      code: "LAB-05",
      title: "Survival Speaking",
      desc: "Phản xạ tức thì khi bí từ, câu cứu sinh thoát kẹt và giữ nhịp trò chuyện liên tục",
      href: "/survival",
      icon: LifeBuoy,
      badge: "CIRCUMLOCUTION",
      spec: "ZERO FREEZE • RECOVERY",
    },
    {
      code: "LAB-06",
      title: "Repair Lab & Latency",
      desc: "Sửa lỗi tức thì qua vòng lặp Retry và ép tốc độ phản xạ bật từ dưới 2 giây",
      href: "/retry-lab",
      icon: RotateCcw,
      badge: "SELF-REPAIR",
      spec: "CORRECT → SAY AGAIN",
    },
  ];

  const immersiveStudios = [
    {
      code: "COMBAT-01",
      title: "Phòng Luyện Nói Live",
      desc: "Vòng lặp khẩu ngữ tự do thời gian thực cùng Gia sư AI thông minh có hỗ trợ ngắt câu VAD",
      href: "/session",
      icon: Mic,
      badge: "REAL-TIME AI",
      spec: "FULL-DUPLEX • SMART VAD",
      highlight: true,
    },
    {
      code: "COMBAT-02",
      title: "Hội Thoại AI Nhập Vai",
      desc: "11+ kịch bản thực tế đa dạng: Phỏng vấn xin việc, công sở, du lịch, đàm phán và tranh luận",
      href: "/conversation",
      icon: MessageSquareText,
      badge: "11+ WORLDS",
      spec: "DYNAMIC TWISTS • STATEFUL",
      highlight: false,
    },
    {
      code: "COMBAT-03",
      title: "Thử Thách Nâng Cao",
      desc: "3 Tracks (Phản xạ · Lập luận Toulmin · Diễn thuyết) × 3 Levels liên thông nền tảng vững chắc",
      href: "/latency",
      icon: Zap,
      badge: "REFLEX BLITZ",
      spec: "SUB-1.2S • HIGH PRESSURE",
      highlight: false,
    },
    {
      code: "COMBAT-04",
      title: "Phòng Nâng Cao / Tranh Biện",
      desc: "Tranh biện học thuật, bảo vệ luận điểm theo mô hình Toulmin và phản xạ áp lực cao",
      href: "/advanced",
      icon: Target,
      badge: "TOULMIN & BLITZ",
      spec: "CLAIM-DATA-WARRANT",
      highlight: false,
    },
  ];

  return (
    <div className="w-full max-w-none space-y-5 pb-12 animate-in fade-in-0 duration-150">
      {/* ── 0. SECTION 01 TECHNICAL SUB-HEADER STRIP (ANVIL.SH STYLE) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-border bg-card px-3.5 py-2 shadow-[3px_3px_0px_var(--industrial-shadow-color)] font-mono text-[11px]">
        <div className="flex items-center gap-2 font-bold">
          <span className="size-2 bg-primary inline-block" />
          <span>SECTION 01 // RUNTIME FLUENCY CONTROL PLANE</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-muted-foreground">
          <span>KERNEL v4.8-LTS (WHISPER-ONNX / KOKORO-82M / SQLITE-WAL)</span>
          <span>•</span>
          <span className="text-foreground font-bold">SLA: 99.9% DETERMINISTIC</span>
        </div>
        {/* Mobile/Tablet Quick Theme Bar */}
        <div className="flex xl:hidden items-center gap-1">
          {INDUSTRIAL_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setIndustrialTheme(t.id)}
              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold border border-border cursor-pointer ${
                industrialTheme === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t.code}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. ANVIL.SH 2-COLUMN HERO CONTROL PLANE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN (6 COLS): BRUTALIST HERO + CLI LAUNCHER + 4 KPI BOXES */}
        <div className="lg:col-span-6 flex flex-col justify-between gap-4 border-2 border-border bg-card p-4 sm:p-6 shadow-[5px_5px_0px_var(--industrial-shadow-color)]">
          <div className="space-y-4">
            {/* Acid Lime Announcement Strip */}
            <div className="inline-flex flex-wrap items-center gap-2 border-2 border-border bg-accent text-accent-foreground px-2.5 py-1 shadow-[3px_3px_0px_var(--industrial-shadow-color)] font-mono text-[11px] font-bold">
              <span className="bg-foreground text-background px-1.5 py-0.2 text-[10px] font-black">
                NEW
              </span>
              <span>SPEAK.SH v4.8 DETERMINISTIC AUDIO ENGINE &amp; 5-THEME UI</span>
              <Link
                href="/shadowing"
                className="underline underline-offset-2 font-black hover:text-primary ml-1"
              >
                READ SPEC →
              </Link>
            </div>

            {/* Giant Brutalist Display Headline */}
            <div className="space-y-1 pt-1">
              <h1 className="font-sans font-black text-3xl sm:text-4xl xl:text-[44px] leading-[1.04] tracking-tight uppercase text-foreground">
                <span className="block">DETERMINISTIC</span>
                <span className="inline-block -rotate-1 bg-accent text-accent-foreground border-[3px] border-border px-3 py-0.5 my-1.5 shadow-[4px_4px_0px_var(--industrial-shadow-color)]">
                  SPEECH KERNEL
                </span>
                <span className="block">FOR ZERO-HESITATION</span>
                <span className="block">ENGLISH FLUENCY.</span>
              </h1>
            </div>

            {/* Technical Description */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl font-medium">
              Loại bỏ hoàn toàn thói quen dịch nhẩm, ngập ngừng và sai trọng âm.{" "}
              <strong className="text-foreground font-mono">SPEAK.SH</strong> biên dịch phản xạ khẩu
              ngữ qua vòng lặp <strong className="text-foreground font-mono">SQLite 70/30</strong>,
              chấm điểm <strong className="text-foreground font-mono">Fast-Pass &lt;2ms</strong> và
              đồng bộ sóng âm IPA thời gian thực.
            </p>

            {/* Interactive Studio Command Launcher (ANVIL CLI Box Equivalent) */}
            <div className="border-2 border-border bg-secondary/50 shadow-[3px_3px_0px_var(--industrial-shadow-color)]">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b-2 border-border bg-muted px-3 py-1.5 font-mono text-[10px]">
                <span className="font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Terminal className="size-3 text-primary" />
                  <span>LAUNCH STUDIO // ZERO-LOBBY BINARY</span>
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {COMMAND_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedCmdIdx(idx)}
                      className={`px-1.5 py-0.5 font-mono text-[10px] font-bold border cursor-pointer transition-all ${
                        selectedCmdIdx === idx
                          ? "bg-foreground text-background border-border"
                          : "bg-card text-foreground border-border/60 hover:border-border"
                      }`}
                    >
                      {preset.tabLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 bg-[#121210] text-[#F6F4EE] px-3 py-2.5 font-mono text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
                  <span className="text-[#FF5500] font-black shrink-0">$</span>
                  <code className="text-[#CCFF00] whitespace-nowrap font-bold">
                    {activeCmd.command}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyCommand}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    title="Sao chép lệnh"
                  >
                    {copiedCmd ? <Check className="size-3 text-[#CCFF00]" /> : <Copy className="size-3" />}
                    <span className="hidden sm:inline">{copiedCmd ? "COPIED" : "COPY"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(activeCmd.href)}
                    className="px-2.5 py-1 bg-[#FF5500] hover:bg-[#ff6a22] text-white border border-black text-[10px] font-mono font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="size-2.5 fill-current" />
                    <span>EXEC</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dual Hardware CTA Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href="/session">
                <Button
                  size="lg"
                  className="h-11 px-5 font-mono font-black text-xs uppercase tracking-wider gap-2 bg-primary text-primary-foreground border-2 border-border shadow-[4px_4px_0px_var(--industrial-shadow-color)]"
                >
                  <Mic className="size-4" />
                  <span>BẮT ĐẦU LUYỆN NÓI LIVE →</span>
                </Button>
              </Link>
              <Link href="/sentence-builder">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 px-4 font-mono font-bold text-xs uppercase tracking-wider gap-2 bg-card text-foreground border-2 border-border shadow-[4px_4px_0px_var(--industrial-shadow-color)]"
                >
                  <Layers className="size-4 text-primary" />
                  <span>SENTENCE BUILDER</span>
                </Button>
              </Link>
              <Link href="/chunks">
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-11 px-3.5 font-mono font-bold text-xs uppercase tracking-wider gap-1.5 border-2 border-border shadow-[4px_4px_0px_var(--industrial-shadow-color)]"
                >
                  <Zap className="size-3.5 text-primary" />
                  <span>CHUNKS LAB</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom 4 Framed KPI Spec Cells */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-2 border-border bg-secondary/40 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-border mt-2">
            <div className="p-2.5">
              <div className="font-mono font-black text-lg sm:text-xl text-foreground leading-none">
                1.18s
              </div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                AVG TTFW LATENCY
              </div>
            </div>
            <div className="p-2.5">
              <div className="font-mono font-black text-lg sm:text-xl text-primary leading-none">
                70 / 30
              </div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                SQLITE FLY-WHEEL
              </div>
            </div>
            <div className="p-2.5">
              <div className="font-mono font-black text-lg sm:text-xl text-foreground leading-none">
                94.2%
              </div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                PROSODY LOCK
              </div>
            </div>
            <div className="p-2.5">
              <div className="font-mono font-black text-lg sm:text-xl text-foreground leading-none">
                10 LABS
              </div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                ACTIVE STUDIOS
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (6 COLS): SPEAK_OS // ACOUSTIC & TELEMETRY CONSOLE */}
        <div className="lg:col-span-6 flex flex-col justify-between border-2 border-border bg-[#121210] text-[#F6F4EE] shadow-[5px_5px_0px_var(--industrial-shadow-color)] overflow-hidden">
          {/* Console Top Title Bar */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#1B1B18] border-b-2 border-border font-mono text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="size-2.5 bg-[#FF5500] border border-black inline-block" />
                <span className="size-2.5 bg-[#FFB800] border border-black inline-block" />
                <span className="size-2.5 bg-[#CCFF00] border border-black inline-block" />
              </div>
              <span className="font-bold text-neutral-200 truncate ml-1">
                SPEAK_OS // ACOUSTIC &amp; TELEMETRY CONSOLE — v4.8.2
              </span>
            </div>
            <span className="px-2 py-0.5 bg-[#102E1E] text-[#00FF66] border border-[#00FF66] text-[10px] font-bold shrink-0">
              ● QUORUM / MIC READY
            </span>
          </div>

          {/* Console 4 Numbered Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b-2 border-neutral-800 bg-[#161613] font-mono text-[10px] font-bold">
            {(
              [
                { id: "scope", label: "01. WAVEFORM SCOPE" },
                { id: "matrix", label: "02. STUDIO MATRIX" },
                { id: "radar", label: "03. SKILL RADAR" },
                { id: "telemetry", label: "04. AI TELEMETRY" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setConsoleTab(t.id)}
                className={`px-2.5 py-2 text-left border-r border-neutral-800 transition-colors cursor-pointer truncate ${
                  consoleTab === t.id
                    ? "bg-[#FF5500] text-white font-black"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Console Main Viewport */}
          <div className="p-4 flex-1 flex flex-col justify-between gap-3.5">
            {consoleTab === "scope" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400">
                  <span>DUAL-TRACE ACOUSTIC OSCILLOSCOPE // 48kHz PCM</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[#CCFF00]">
                      <span className="size-2 bg-[#CCFF00] inline-block" /> NATIVE_REF
                    </span>
                    <span className="flex items-center gap-1 text-[#FF5500]">
                      <span className="size-2 bg-[#FF5500] inline-block" /> USER_VOICE
                    </span>
                  </div>
                </div>

                {/* Live Canvas Oscilloscope */}
                <div className="relative border-2 border-neutral-700 bg-[#0B0B09] p-2">
                  <canvas
                    ref={canvasRef}
                    width={540}
                    height={136}
                    className="w-full h-[136px] block"
                  />
                  <div className="mt-2 pt-2 border-t border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                    <div>
                      <span className="text-neutral-500 block">PITCH LOCK</span>
                      <strong className="text-[#CCFF00] text-xs">96.4% SYNC</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">STRESS TIMING</span>
                      <strong className="text-white text-xs">91.8% IPA</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">TTFW LATENCY</span>
                      <strong className="text-[#FF5500] text-xs">1.14s FAST</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">FAST-PASS GATE</span>
                      <strong className="text-emerald-400 text-xs">&lt;1.8ms HIT</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {consoleTab === "matrix" && (
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                {[
                  { code: "01", name: "Sentence Builder", href: "/sentence-builder", status: "READY" },
                  { code: "02", name: "VN → EN Direct", href: "/vn-to-en", status: "READY" },
                  { code: "03", name: "Shadowing Studio", href: "/shadowing", status: "SYNCED" },
                  { code: "04", name: "Spoken Vocabulary", href: "/vocabulary", status: "OXFORD" },
                  { code: "05", name: "Chunk Automaticity", href: "/chunks", status: "DAG_OK" },
                  { code: "06", name: "Survival Speaking", href: "/survival", status: "ARMED" },
                  { code: "07", name: "Spoken Repair Lab", href: "/retry-lab", status: "LOOP_OK" },
                  { code: "08", name: "Response Latency", href: "/latency", status: "BLITZ" },
                  { code: "09", name: "AI Roleplay Worlds", href: "/conversation", status: "11_WORLDS" },
                  { code: "10", name: "Toulmin & Debate", href: "/advanced", status: "PRESSURE" },
                ].map((s) => (
                  <Link
                    key={s.code}
                    href={s.href}
                    className="flex items-center justify-between p-2 border border-neutral-700 bg-[#181815] hover:border-[#FF5500] hover:bg-[#22221D] transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-1 bg-[#FF5500] text-white text-[9px] font-bold">
                        {s.code}
                      </span>
                      <span className="text-neutral-200 font-bold truncate">{s.name}</span>
                    </div>
                    <span className="text-[9px] text-[#CCFF00] shrink-0">{s.status} →</span>
                  </Link>
                ))}
              </div>
            )}

            {consoleTab === "radar" && (
              <div className="space-y-2.5 font-mono text-xs py-1">
                {[
                  { label: "01. SYNTACTIC REFLEX (SENTENCE BUILDER)", pct: 88, color: "#FF5500" },
                  { label: "02. DIRECT CONCEPT RETRIEVAL (VN → EN)", pct: 82, color: "#CCFF00" },
                  { label: "03. PHONETIC STRESS & PROSODY (SHADOW/VOCAB)", pct: 94, color: "#00FF66" },
                  { label: "04. CIRCUMLOCUTION & SELF-REPAIR", pct: 79, color: "#FFB800" },
                  { label: "05. TOULMIN ARGUMENTATION & COMPOSURE", pct: 85, color: "#38BDF8" },
                ].map((skill) => (
                  <div key={skill.label} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-300 font-bold">{skill.label}</span>
                      <span className="text-[#CCFF00] font-bold">{skill.pct}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-neutral-900 border border-neutral-700 p-0.5">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${skill.pct}%`, backgroundColor: skill.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {consoleTab === "telemetry" && (
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="p-2.5 border border-neutral-700 bg-[#171714]">
                  <span className="text-[10px] text-neutral-400 block">ACTIVE LLM ENGINE</span>
                  <strong className="text-[#CCFF00] text-sm uppercase">
                    {activeProvider} // {activeModel}
                  </strong>
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    Auto-fallback &amp; JSON repair enabled
                  </span>
                </div>
                <div className="p-2.5 border border-neutral-700 bg-[#171714]">
                  <span className="text-[10px] text-neutral-400 block">STT / TTS PIPELINE</span>
                  <strong className="text-[#FF5500] text-sm uppercase">
                    {sttProvider} + {ttsProvider}
                  </strong>
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    Client playbackRate scaling (Zero double-scale)
                  </span>
                </div>
                <div className="p-2.5 border border-neutral-700 bg-[#171714]">
                  <span className="text-[10px] text-neutral-400 block">CONTENT BANK FLYWHEEL</span>
                  <strong className="text-emerald-400 text-sm">70% SQLITE / 30% AI</strong>
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    Single-roll probability • WAL mode active
                  </span>
                </div>
                <div className="p-2.5 border border-neutral-700 bg-[#171714]">
                  <span className="text-[10px] text-neutral-400 block">UI THEME ENGINE</span>
                  <strong className="text-white text-sm uppercase">{industrialTheme}</strong>
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    5-Preset Industrial Switcher • X-RAY Ready
                  </span>
                </div>
              </div>
            )}

            {/* Subsystem Circuit Breakers (Click to Trip / Reset) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400">
                <span>SUBSYSTEM CIRCUIT BREAKERS (CLICK TO TOGGLE)</span>
                <span className="text-[#CCFF00]">4 CHANNELS ARMED</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                {(Object.keys(breakers) as Array<keyof typeof breakers>).map((key) => {
                  const closed = breakers[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleBreaker(key)}
                      className={`p-2 border text-left transition-all cursor-pointer ${
                        closed
                          ? "border-neutral-700 bg-[#1A1A17] hover:border-[#CCFF00]"
                          : "border-[#FF5500] bg-[#2A1208]"
                      }`}
                    >
                      <div className="font-bold text-neutral-200 truncate">{key}</div>
                      <div
                        className={`text-[9px] font-black mt-0.5 ${
                          closed ? "text-[#00FF66]" : "text-[#FF5500]"
                        }`}
                      >
                        {closed ? "● [CLOSED]" : "▲ [TRIPPED]"}
                      </div>
                    </button>
                  );
                })}

                {/* 4th Breaker: X-RAY WIREFRAME */}
                <button
                  type="button"
                  onClick={toggleXrayMode}
                  className={`p-2 border text-left transition-all cursor-pointer ${
                    xrayMode
                      ? "border-[#CCFF00] bg-[#232B08]"
                      : "border-neutral-700 bg-[#1A1A17] hover:border-[#CCFF00]"
                  }`}
                >
                  <div className="font-bold text-neutral-200 truncate">X_RAY_MODE</div>
                  <div
                    className={`text-[9px] font-black mt-0.5 ${
                      xrayMode ? "text-[#CCFF00]" : "text-neutral-400"
                    }`}
                  >
                    {xrayMode ? "● [ACTIVE]" : "○ [STANDBY]"}
                  </div>
                </button>
              </div>
            </div>

            {/* Live Kernel Log + Bottom Console Controls */}
            <div className="space-y-2 pt-1 border-t border-neutral-800">
              <div className="bg-[#0B0B09] border border-neutral-800 p-2 font-mono text-[10px] text-neutral-300 space-y-0.5">
                {consoleLogs.map((line, i) => (
                  <div key={i} className="truncate">
                    {line}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerPulse}
                    className="px-2.5 py-1 bg-[#FF5500] hover:bg-[#ff6a22] text-white font-mono text-[10px] font-black uppercase cursor-pointer border border-black"
                  >
                    ⚡ PULSE ACOUSTIC TEST
                  </button>
                  <button
                    type="button"
                    onClick={toggleXrayMode}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-[#CCFF00] font-mono text-[10px] font-bold uppercase cursor-pointer border border-neutral-600 flex items-center gap-1"
                  >
                    <ScanLine className="size-3" />
                    <span>{xrayMode ? "DISABLE X-RAY" : "INSPECT X-RAY"}</span>
                  </button>
                </div>
                <Link
                  href={activeCmd.href}
                  className="font-mono text-[11px] font-black text-[#CCFF00] hover:underline flex items-center gap-1"
                >
                  <span>OPEN {activeCmd.studioName.toUpperCase()}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SECTION 02 // FOUNDATION AUTOMATICITY LABS (6 CORE STUDIOS) ── */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-foreground text-background font-mono text-[10px] font-black">
              SEC-02
            </span>
            <h2 className="font-serif font-extrabold text-sm sm:text-base uppercase tracking-tight text-foreground">
              Nền Tảng Phản Xạ Khẩu Ngữ (Foundation Automaticity Labs)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-extrabold text-accent-foreground bg-accent px-2.5 py-0.5 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)]">
            06 CORE MODULES // ZERO-HESITATION
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {foundationStudios.map((m, idx) => {
            const Icon = m.icon;
            const iconBoxClasses = [
              "bg-primary text-primary-foreground",
              "bg-accent text-accent-foreground",
              "bg-[#FFB800] text-[#0D0E0D]",
              "bg-[#00E676] text-[#0D0E0D]",
            ][idx % 4];
            return (
              <Link key={m.href} href={m.href} className="group block focus:outline-hidden">
                <div className="h-full border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_var(--industrial-shadow-color)] transition-all flex flex-col justify-between relative cursor-pointer">
                  {/* Tier 1: Technical Top Strip */}
                  <div className="px-3.5 py-1.5 border-b-2 border-border bg-secondary flex items-center justify-between gap-2 font-mono text-[10px] font-extrabold">
                    <span className="text-foreground tracking-wider uppercase">
                      [{m.code}] // DRILL LAB
                    </span>
                    <span className="px-1.5 py-0.5 bg-foreground text-background border border-border uppercase">
                      {m.badge}
                    </span>
                  </div>

                  {/* Tier 2: Icon + Title + Description */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-9 shrink-0 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] flex items-center justify-center ${iconBoxClasses}`}
                      >
                        <Icon className="size-4.5 stroke-[2.25]" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-serif font-extrabold text-sm uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    </div>

                    {/* Tier 3: Dashed Command Footer */}
                    <div className="pt-2.5 border-t-2 border-dashed border-border flex items-center justify-between font-mono text-[10px] font-extrabold">
                      <span className="text-muted-foreground uppercase">{m.spec}</span>
                      <span className="flex items-center gap-1 text-primary group-hover:translate-x-0.5 transition-transform uppercase">
                        <span>DEPLOY {m.href.toUpperCase()}</span>
                        <ArrowRight className="size-3 stroke-[2.5]" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 3. SECTION 03 // IMMERSIVE & HIGH-PRESSURE COMBAT STUDIOS (4 STUDIOS) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground font-mono text-[10px] font-black border border-border">
              SEC-03
            </span>
            <h2 className="font-serif font-extrabold text-sm sm:text-base uppercase tracking-tight text-foreground">
              Thực Chiến &amp; Thử Thách Áp Lực Cao (Immersive Combat Studios)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-extrabold text-primary-foreground bg-primary px-2.5 py-0.5 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)]">
            4 Phòng thực chiến
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {immersiveStudios.map((m, idx) => {
            const Icon = m.icon;
            const iconBoxClasses = [
              "bg-primary text-primary-foreground",
              "bg-accent text-accent-foreground",
              "bg-[#FFB800] text-[#0D0E0D]",
              "bg-[#00E676] text-[#0D0E0D]",
            ][idx % 4];
            return (
              <Link key={m.title} href={m.href} className="group block focus:outline-hidden">
                <div className="h-full border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_var(--industrial-shadow-color)] transition-all flex flex-col justify-between relative cursor-pointer">
                  {/* Tier 1: Technical Top Strip */}
                  <div
                    className={`px-3.5 py-1.5 border-b-2 border-border flex items-center justify-between gap-2 font-mono text-[10px] font-extrabold ${
                      m.highlight ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    <span className="tracking-wider uppercase">[{m.code}] // COMBAT</span>
                    <span className="px-1.5 py-0.5 bg-foreground text-background border border-border uppercase">
                      {m.badge}
                    </span>
                  </div>

                  {/* Tier 2: Icon + Title + Description */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-9 shrink-0 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] flex items-center justify-center ${iconBoxClasses}`}
                      >
                        <Icon className="size-4.5 stroke-[2.25]" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-serif font-extrabold text-sm uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    </div>

                    {/* Tier 3: Dashed Command Footer */}
                    <div className="pt-2.5 border-t-2 border-dashed border-border flex items-center justify-between font-mono text-[10px] font-extrabold">
                      <span className="text-muted-foreground uppercase">{m.spec}</span>
                      <span className="flex items-center gap-1 text-primary group-hover:translate-x-0.5 transition-transform uppercase">
                        <span>DEPLOY</span>
                        <ArrowRight className="size-3 stroke-[2.5]" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 4. INDUSTRIAL PRIVACY & KERNEL CONFIG FOOTER BAR ── */}
      <div className="border-2 border-border bg-card px-4 py-3 shadow-[3px_3px_0px_var(--industrial-shadow-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 font-mono">
          <div className="size-7 bg-accent text-accent-foreground border-2 border-border flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <span className="truncate text-muted-foreground">
            <strong className="text-foreground uppercase">LOCAL AUDIO ISOLATION //</strong> Xử lý âm
            thanh trực tiếp qua WebAudio &amp; Whisper-ONNX cục bộ, độ trễ thấp, bảo mật tuyệt đối.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Link href="/usage">
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[11px] font-mono">
              <Activity className="size-3.5 mr-1 text-primary" />
              <span>AI TELEMETRY</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="default" size="sm" className="h-8 px-3 text-[11px] font-mono">
              <Settings className="size-3.5 mr-1" />
              <span>KERNEL SETTINGS</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
