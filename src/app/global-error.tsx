'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center p-6 bg-[#FAF7F2] text-[#24211E] font-sans">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl bg-white border border-[#E8E2D6] shadow-sm">
          <div className="size-12 rounded-2xl bg-[#C25E38]/10 text-[#C25E38] mx-auto flex items-center justify-center font-bold text-xl font-serif">
            !
          </div>
          <h2 className="text-xl font-serif font-bold text-[#24211E]">Lỗi Hệ Thống</h2>
          <p className="text-xs text-[#706B63] font-mono leading-relaxed bg-[#FAF7F2] p-3 rounded-xl">
            {error.message || 'Đã có lỗi nghiêm trọng xảy ra.'}
          </p>
          <button
            onClick={reset}
            className="rounded-xl bg-[#C25E38] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#C25E38]/90 transition-all cursor-pointer shadow-xs"
          >
            Thử tải lại ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}
