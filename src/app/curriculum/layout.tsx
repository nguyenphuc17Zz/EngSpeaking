import Link from "next/link";

export default function CurriculumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Teacher & Curriculum</h1>
        <p className="text-sm text-muted-foreground">LEARNER → SPEAK → MEASURE → DIAGNOSE → PRIORITIZE → TEACH → REPEAT (§132)</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/curriculum", label: "Today" },
          { href: "/curriculum/history", label: "History" },
          { href: "/curriculum/debug", label: "Debug" },
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
