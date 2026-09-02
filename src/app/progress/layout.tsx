import Link from "next/link";

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress Analytics</h1>
        <p className="text-sm text-muted-foreground">PROGRESS OVER SCORES — Historical snapshots, trends, milestones, intervention effectiveness (§1)</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/progress", label: "Overview" },
          { href: "/progress/skills", label: "Skills" },
          { href: "/progress/dimensions", label: "Dimensions" },
          { href: "/progress/journey", label: "Journey" },
          { href: "/progress/comparisons", label: "Comparisons" },
          { href: "/progress/reports", label: "Reports" },
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
