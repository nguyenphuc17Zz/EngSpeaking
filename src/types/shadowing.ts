export interface YouTubeTranscriptSegment {
  segment_id: string;
  text: string;
  start_time: number;
  end_time: number;
}

// PROMPT 1 Models
export interface SegmentEnhancement {
  segment_id: string;
  thought_groups_text: string; // e.g. "What are you going to do / about the project? // We need to / wrap it up."
  ipa_transcription: string;
  stress_words: string[];
}

export interface VocabularyItem {
  word: string;
  ipa: string;
  phonetic_ipa?: string;
  meaning: string;
  part_of_speech: string;
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | string;
  context_sentence: string;
  source_segment_id: string;
  source_text_span: string;
  learning_value: number;
}

export interface GrammarItem {
  pattern: string;
  meaning: string;
  structure: string;
  context: string;
  source_segment_id: string;
  source_text_span: string;
  learning_value: number;
}

export interface ConnectedSpeechItem {
  pattern_type:
    | "reduction & assimilation"
    | "consonant_to_vowel_linking"
    | "vowel_to_vowel_linking"
    | "flap_t"
    | "glottal_stop"
    | "weak_form"
    | "elision"
    | string;
  text_span: string;
  spoken_realization: string;
  explanation: string;
  source_segment_id: string;
  importance: "critical" | "high" | "medium" | "low";
}

export interface NaturalExpressionItem {
  expression: string;
  meaning: string;
  category: "filler" | "discourse_marker" | "collocation" | "idiom" | "reaction" | string;
  context_sentence: string;
  source_segment_id: string;
  source_text_span: string;
  learning_value: number;
}

export interface LinguisticAnalysisResult {
  segments_enhancement?: SegmentEnhancement[];
  thought_groups?: Array<{
    segment_id: string;
    original_text?: string;
    thought_groups?: string[];
    pause_marked_text?: string;
    focus_words?: string[];
  }>;
  vocabulary: VocabularyItem[];
  grammar_and_phrasal_verbs?: GrammarItem[];
  connected_speech_highlights: ConnectedSpeechItem[];
  natural_expressions: NaturalExpressionItem[];
}

// PROMPT 2 Models
export interface AudioVideoProfile {
  topic: string;
  speaking_style: string; // e.g. "Casual / Business Formal / Technical Presentation"
  accent_profile: string; // e.g. "General American (GA) / British RP / Australian / Neutral Global"
  speech_speed_description: string; // e.g. "Tốc độ tự nhiên bản xứ (~150 WPM)"
  overall_difficulty: "easy" | "normal" | "hard" | "very_hard";
  recommended_focus: string; // e.g. "Connected Speech / Sentence Rhythm"
  pedagogical_takeaway: string;
}

// PROMPT 3 Models
export interface NuancedTranslation {
  translated_text: string;
  tone: string;
  nuance_note: string;
}

// PROMPT 4 Models (Multi-Dimensional Speech Evaluator)
export interface EvaluatedWord {
  word: string;
  status: "correct" | "missing" | "mispronounced" | "linked" | "extra";
  ipa?: string;
  user_said?: string;
  tip?: string;
}

export interface ConnectedSpeechFeedback {
  target_phrase: string;
  type: string;
  tip: string;
}

export interface ActionableImprovement {
  area: string;
  actionable_fix: string;
}

export interface MultiDimensionalSpeechEvaluation {
  overall_score: number; // 0 - 100
  accuracy_score: number; // 0 - 100
  pacing_score: number; // 0 - 100
  connected_speech_score: number; // 0 - 100
  intonation_score: number; // 0 - 100
  metrics: {
    target_wpm: number;
    user_wpm: number;
    duration_gap_sec: number;
    pacing_ratio: number;
    pacing_verdict: string;
  };
  word_breakdown: EvaluatedWord[];
  connected_speech_feedback: ConnectedSpeechFeedback[];
  strengths: string[];
  top_improvements: ActionableImprovement[];
  mastery_level: "new" | "practicing" | "mastered";
  practice_tip: string;
}

// PROMPT 5 Models (Dynamic Lesson Generator)
export interface LessonStage {
  stage_number: number;
  stage_name: "Warm-up" | "Rhythm & Linking" | "Vocabulary in Action" | "Speed Challenge" | "Final Mastery" | string;
  description: string;
  recommended_speed: number; // 0.75, 0.85, 1.0, 1.25
  recommended_mode: "echo" | "shadow" | "repeat" | "blind";
  target_segment_ids: string[];
  focus_goal: string;
}

export interface DynamicShadowingLesson {
  lesson_title: string;
  total_duration_minutes: number;
  stages: LessonStage[];
}

export interface YouTubeVideoPreset {
  id: string;
  title: string;
  channel: string;
  youtubeId: string;
  thumbnail: string;
  cefrLevel: string;
  duration: string;
  sampleTranscript?: YouTubeTranscriptSegment[];
}

export interface SavedYouTubeItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  cefrLevel: string;
  duration: string;
  segmentsCount: number;
  savedAt: string;
  favorite: boolean;
  segments: YouTubeTranscriptSegment[];
  profile?: AudioVideoProfile | null;
  analysis?: LinguisticAnalysisResult | null;
  lesson?: DynamicShadowingLesson | null;
}
