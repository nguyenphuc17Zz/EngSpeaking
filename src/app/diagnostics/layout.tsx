import Link from "next/link";

export default function DiagnosticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Speaking Diagnostics</h1>
        <p className="text-sm text-muted-foreground">EVIDENCE → INTERPRETATION → PATTERN → BOTTLENECK → ACTION (§103) — Practice Score, không phải TOEIC/IELTS</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/diagnostics", label: "Tổng quan" },
          { href: "/diagnostics/history", label: "Lịch sử" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="rounded-full border bg-card px-3 py-1.5 hover:bg-muted text-sm">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
