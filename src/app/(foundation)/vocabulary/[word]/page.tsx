"use client";

import { useParams } from "next/navigation";
import { VocabularyGymWorkspace } from "@/components/foundation/vocabulary/VocabularyGymWorkspace";

export default function DynamicVocabularyPage() {
  const params = useParams();
  const rawWord = params?.word;
  const word = Array.isArray(rawWord) ? rawWord[0] : rawWord;

  return <VocabularyGymWorkspace initialWord={word} />;
}
