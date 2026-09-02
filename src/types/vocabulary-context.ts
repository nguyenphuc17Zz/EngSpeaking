// Function 8 — Spoken Vocabulary & Context Studio Domain Types
// 2-Step Word-to-Sentence Spoken Lexicon

export interface WordCollocation {
  phrase: string; // e.g. "make a decision"
  meaningVi: string; // e.g. "đưa ra quyết định"
  exampleSentence: string;
}

export interface ContextSentenceItem {
  id: string;
  domain: "workplace" | "daily_life" | "opinions" | "academic";
  domainTitleVi: string; // e.g. "Bối cảnh Công việc"
  sentenceEn: string; // e.g. "We need to make a final decision by Friday."
  sentenceVi: string; // e.g. "Chúng ta cần đưa ra quyết định cuối cùng trước thứ Sáu."
  targetWordHighlighted: string;
  linkingSoundHints?: string; // e.g. "need to -> need-tuh"
}

export interface SpokenWordItem {
  id: string;
  word: string; // e.g. "decision"
  ipaUS: string; // e.g. "/dɪˈsɪʒ.ən/"
  ipaUK?: string; // e.g. "/dɪˈsɪʒ.ən/"
  partOfSpeech: string; // e.g. "noun"
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  meaningVi: string; // e.g. "Sự quyết định, phán quyết"
  englishDefinition: string; // e.g. "A choice that you make about something after thinking about several possibilities."
  stressedSyllableIndex: number; // e.g. 2nd syllable (1-based or 0-based)
  stressExplanationVi: string; // e.g. "Trọng âm rơi vào âm tiết thứ hai: de-CI-sion"
  endingSoundGuideVi: string; // e.g. "Âm đuôi /ʒ.ən/ nhẹ nhàng, không đọc thành 'sơn'"
  
  collocations: WordCollocation[];
  contextSentences: ContextSentenceItem[];
  
  // Progress
  wordMasteryScore: number; // 0-100
  sentenceMasteryScore: number; // 0-100
  isMastered: boolean;
  practiceCount: number;
}

export interface WordPronunciationEvaluation {
  isSuccessful: boolean;
  wordSpokenCorrectly: boolean;
  pronunciationScore: number; // 0-100
  stressAccuracyScore: number; // 0-100
  endingSoundScore: number; // 0-100
  overallScore: number; // 0-100
  
  detectedPhonemes?: string;
  userTranscript: string;
  feedbackVi: string;
  phonemeCorrectionAdvice: string;
}

export interface SentenceContextEvaluation {
  isSuccessful: boolean;
  sentenceClarityScore: number; // 0-100
  linkingFluencyScore: number; // 0-100
  intonationScore: number; // 0-100
  overallScore: number; // 0-100
  
  userTranscript: string;
  feedbackVi: string;
  fluencyAdviceVi: string;
}
