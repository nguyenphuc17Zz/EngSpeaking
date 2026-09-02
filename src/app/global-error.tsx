'use client';
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi"><body className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-3"><h2 className="text-lg font-semibold">Loi he thong</h2><p className="text-sm text-muted-foreground">{error.message}</p><button onClick={reset} className="rounded bg-primary px-4 py-2 text-primary-foreground">Thu lai</button></div>
    </body></html>
  );
}
