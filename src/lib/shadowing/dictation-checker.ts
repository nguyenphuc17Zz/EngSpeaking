// Dictation checking algorithm for Corodomo-style Shadowing

export interface DictationWordDiff {
  expected: string;
  typed?: string;
  status: "correct" | "incorrect" | "missing";
}

export interface DictationCheckResult {
  isCorrect: boolean;
  accuracy: number; // 0 - 100%
  diff: DictationWordDiff[];
  correctCount: number;
  totalExpected: number;
}

function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "")
    .trim();
}

export function checkDictation(
  targetSentence: string,
  userTypedText: string
): DictationCheckResult {
  const targetWords = targetSentence.split(/\s+/).filter(Boolean);
  const typedWords = userTypedText.split(/\s+/).filter(Boolean);

  const diff: DictationWordDiff[] = [];
  let correctCount = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const expected = targetWords[i];
    const typed = typedWords[i];

    if (!typed) {
      diff.push({ expected, status: "missing" });
    } else if (normalizeWord(expected) === normalizeWord(typed)) {
      diff.push({ expected, typed, status: "correct" });
      correctCount++;
    } else {
      diff.push({ expected, typed, status: "incorrect" });
    }
  }

  const totalExpected = targetWords.length || 1;
  const accuracy = Math.round((correctCount / totalExpected) * 100);
  const isCorrect = accuracy >= 95;

  return {
    isCorrect,
    accuracy,
    diff,
    correctCount,
    totalExpected,
  };
}
