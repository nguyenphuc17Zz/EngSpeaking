import Link from "next/link";

export default function ConversationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dynamic Conversation</h1>
        <p className="text-sm text-muted-foreground">Đắm chìm hội thoại — DYNAMIC &gt; SCRIPTED (§3) — vô hạn scenario, character, events</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/conversation", label: "Chọn chế độ" },
          { href: "/conversation/session", label: "Phiên roleplay" },
          { href: "/conversation/history", label: "Lịch sử" },
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
