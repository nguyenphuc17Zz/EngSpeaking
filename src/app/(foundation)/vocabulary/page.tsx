"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VocabularyGymWorkspace } from "@/components/foundation/vocabulary/VocabularyGymWorkspace";

function VocabularyPageContent() {
  const searchParams = useSearchParams();
  const queryWord = searchParams.get("word") || undefined;

  return <VocabularyGymWorkspace initialWord={queryWord} />;
}

export default function VocabularyContextPage() {
  return (
    <Suspense fallback={<VocabularyGymWorkspace />}>
      <VocabularyPageContent />
    </Suspense>
  );
}
