// Function 8 — Spoken Vocabulary & Context Studio Domain Types
// 2-Step Word-to-Sentence Spoken Lexicon with Phoneme Diagnostics & Spontaneous Challenge

export interface WordCollocation {
  phrase: string; // e.g. "make a decision"
  meaningVi: string; // e.g. "đưa ra quyết định"
  exampleSentence: string;
  collocationType?: "verb_noun" | "adj_noun" | "phrasal_verb" | "idiomatic" | "discourse_marker";
  pmiStrength?: "high" | "native_chunk" | "moderate";
}

export interface ContextSentenceItem {
  id: string;
  domain: "workplace" | "daily_life" | "opinions" | "academic" | "casual_banter";
  domainTitleVi: string; // e.g. "Bối cảnh Công việc"
  sentenceEn: string; // e.g. "We need to make a final decision by Friday."
  sentenceVi: string; // e.g. "Chúng ta cần đưa ra quyết định cuối cùng trước thứ Sáu."
  targetWordHighlighted: string;
  linkingSoundHints?: string; // e.g. "need to -> need-tuh"
  rhythmNoteVi?: string; // e.g. "Nhấn mạnh từ 'final' và 'Friday'"
}

export interface SpontaneousChallenge {
  promptEn: string; // e.g. "Your manager asks for your stance on the project delay. Reply in 1-2 spoken sentences."
  promptVi: string; // e.g. "Quản lý hỏi quan điểm của bạn về tiến độ dự án. Hãy tự nói 1-2 câu ứng biến."
  targetCollocation: string; // e.g. "make a tough decision"
  suggestedOpeningEn?: string; // e.g. "To be honest, we have to..."
}

export interface PhonemeBreakdownItem {
  syllableIndex: number;
  raw: string;
  isPrimaryStressed: boolean;
  onset: string;
  nucleus: string;
  coda: string;
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
  spontaneousChallenge?: SpontaneousChallenge;
  
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
  
  // Cutting-Edge Diagnostic Additions
  syllablesDetected?: string[];
  vietnameseL1TrapWarning?: string;
  minimalPairAdvice?: string;
  endingSoundStatus?: "clear" | "weak" | "missing" | "distorted";
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
  
  // Cutting-Edge Spontaneous Mode Additions
  mode?: "guided" | "spontaneous";
  targetWordUsed?: boolean;
  collocationUsedNaturally?: boolean;
  pviRhythmScore?: number; // Normalized Pairwise Variability Index (0-100)
  suggestedAlternativeEn?: string;
}
