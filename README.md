# English Speaking Coach — Phase 8 Progress Analytics & Long-Term Intelligence

AI-first English Speaking Coach — Phase 1-8. Phase 8: PROGRESS OVER SCORES — Historical snapshots, trends, milestones, intervention effectiveness (§1). SPEECH → MEASUREMENT → EVIDENCE → PATTERN → BOTTLENECK → ACTION → PROGRESS (§121).

> Nếu Phase 1 là **Voice Engine**, Phase 2 là **Foundation**, Phase 3 là **Infinite World**, Phase 4 là **Diagnostics**, Phase 5 là **Adaptive Teacher**, Phase 6 là **Advanced**, Phase 7 là **Orchestrator**, Phase 8 là **Progress Intelligence** — I was here → I practiced this → I improved this → I can do something I couldn't before (§1).

> **Đối tượng:** Người đã có nền tảng tiếng Anh nhưng yếu kỹ năng nói & phản xạ (speaking production & automaticity).

## Vòng lặp cốt lõi Phase 1

```
AI nói → Bạn nói → Ghi âm → STT → Transcript → AI hiểu → AI đáp → AI nói → Lặp lại
```

**Yêu cầu hoàn thành Phase 1:** Mở app → bắt đầu phiên → nghe AI chào → nói tiếng Anh → nhận transcript → nhận phản hồi AI → nghe AI nói → tiếp tục nhiều vòng.

## Stack

- Next.js 16 (App Router) + TypeScript strict + Tailwind 4 + shadcn/ui (base-nova)
- Zustand (client state) + Zod (validation) + SQLite (node:sqlite, WAL mode)
- Web Audio / MediaRecorder / Web Speech API / speechSynthesis

## Kiến trúc AI-first

```
UI
 ↓
Application / Session Layer (Zustand FSM)
 ↓
AI Service Interfaces (lib/ai/interfaces)
 ↓
Provider Adapters (lib/ai/providers/{gemini,groq,browser,mock})
 ↓
Gemini / Groq / Browser
```

- React components **không** chứa `if (provider === "gemini")` — gọi `speechService.transcribe()` / `POST /api/ai/chat`.
- `MOCK_AI=true` cho phép dev/test không tốn quota.

## Cấu trúc

```
src/
  app/
    page.tsx
    session/page.tsx      # Phase 1 voice loop
    foundation/           # Phase 2
    conversation/         # Phase 3
    diagnostics/          # Phase 4
    curriculum/           # Phase 5
      page.tsx            # Today + Just Practice 10' + Why This? §89-90
      history/page.tsx    # Plan history §114
      debug/page.tsx      # Learner state + changes §109 (dev only)
    settings/page.tsx
    api/ai/{chat,transcribe,speak,providers,models}
    api/sessions/**, api/foundation/**, api/conversation/**, api/evaluation/**,
    api/learner/state, api/curriculum/{today,generate,replan,history,recommendation}
  components/{voice,conversation,settings,common,ui,foundation/*,diagnostics/*,curriculum/WhyThisPanel}
  features/voice-session/state/machine.ts
  lib/
    ai/{interfaces,providers,models,routing,prompts}
    audio/{recorder,player}
    foundation/{engines,skills/taxonomy,difficulty/{model,engine},prompts,services}
    conversation/{engines,prompts,services,mock}
    diagnostics/{engines,prompts,services,mock,pipeline}
    curriculum/
      skill-graph.ts (§8) + mastery.ts (§9-13) + goal-mapping.ts (§16) + bottleneck.ts (§14)
      learner-state-service.ts (§52-53) + decision-engine.ts (§18, §30) + validation.ts (§80-81)
      prompts/teacher/{learner-state-analyzer,bottleneck-prioritizer,next-action,session-planner,difficulty-planner,review-planner,progress-interpreter,teacher-explainer}.ts (§73)
      mock/profiles.ts (§119)
    voice-engine/engine.ts
    stt/service.ts  tts/browser.ts
    validation/{schemas,foundation-schemas,conversation-schemas,diagnostics-schemas,curriculum-schemas}
  stores/{voice-session-store,settings-store,foundation-store,conversation-store}
  hooks/{useAudioRecorder,useAudioPlayer,useSpeechRecognition,useBrowserTTS}
  types/{ai,audio,conversation,session,foundation,conversation-world,diagnostics,learner}
  data/app.db           # Persistent SQLite database (WAL mode)
```

## Cấu hình

Copy `.env.example` → `.env.local`:

```env
# Server-only — không bao giờ gửi ra browser
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
MOCK_AI=false
```

- Lưu trữ cục bộ hoàn toàn với SQLite (`data/app.db`), không cần setup cloud database bên ngoài.
- Mặc định theo lựa chọn người dùng: **STT = Browser Web Speech API**, **TTS = Browser speechSynthesis** (miễn phí, không tốn quota). Đổi sang Groq Whisper / Gemini trong **/settings**.

## Chạy

```bash
pnpm install
pnpm dev      # http://localhost:3000  (/foundation, /conversation, /diagnostics, /curriculum)
pnpm build    # production build
pnpm test     # vitest
pnpm typecheck
```

### Database (SQLite cục bộ)

- Tự động khởi tạo database tại `data/app.db` ở chế độ WAL (Write-Ahead Logging).
- Lưu trữ toàn diện: Content banks (câu hỏi/bài tập AI), sessions, turns, foundation attempts, baselines, speaking evaluations, progress metrics, curriculum plans, telemetry.

## Provider / Model

| Provider | Model | Capability | Ghi chú |
|----------|-------|------------|---------|
| gemini | gemini-2.0-flash / 1.5-flash / 1.5-pro | textGeneration | Primary |
| groq | llama-3.3-70b / 3.1-8b / mixtral | textGeneration | LPU nhanh |
| groq | whisper-large-v3(-turbo) | speechToText | STT server |
| browser | browser-stt | speechToText | **Default Phase 1** |
| browser | browser-tts | textToSpeech | **Default Phase 1** |
| mock | mock-* | all | Dev/test |

Capability filtering: selector chỉ hiển thị model có `capability` tương ứng (§37). Thêm provider mới chỉ thêm vào `CATALOG` + adapter.

**Auto mode:** capability-aware, deterministic `Gemini → Groq → Browser`. Phase 1 **không tự fallback** khi lỗi (§36) — báo lỗi rõ ràng, người dùng tự đổi.

## API nội bộ

- `GET /api/ai/providers` — không lộ key
- `GET /api/ai/models?provider=&capability=&live=`
- `POST /api/ai/chat` — opening/reply/generic
- `POST /api/ai/transcribe` — Groq Whisper FormData
- `POST /api/ai/speak` — browser stub
- `POST /api/sessions` / turns / end
- **Foundation:**
  - `POST /api/foundation/exercises` — `FoundationExercise`
  - `GET /api/foundation/exercises?daily=1&mins=10` — daily plan
  - `POST /api/foundation/evaluate` — `FoundationEvaluation`
  - `POST /api/foundation/hint` — level 0-4
  - `POST /api/foundation/baseline` — `generate`/`evaluate`
  - `POST /api/foundation/sessions` / `[id]/attempts` / `[id]/complete`
  - `GET /api/foundation/progress`
- **Conversation (Phase 3):**
  - `POST /api/conversation/scenario` — `ScenarioBlueprint` + fingerprint dedup
  - `POST /api/conversation/turn` — `ConversationAIResponse` + `nextWorldState`
  - `POST /api/conversation/event` — maybeGenerateEvent
  - `POST /api/conversation/summary` — `ConversationSummary`
  - `GET /api/conversation/worlds` — list + detail (resume)
- **Diagnostics (Phase 4):**
  - `POST /api/evaluation/session` — `{sessionId, turns, provider, hasAudio}` → `SpeakingEvaluation` + `Snapshot` (cache 30m)
  - `GET /api/evaluation/{latest,history,snapshot}` — history/snapshot
- **Curriculum (Phase 5):**
  - `GET /api/learner/state` — load `LearnerState` (default hoặc DB, anonymous)
  - `POST /api/learner/state` — save state (SQLite `learner_states`)
  - `GET /api/curriculum/today?duration=10&provider=mock` — daily plan nhanh
  - `POST /api/curriculum/generate` — `{learnerState, duration, goalOverride, provider}` → `LearningSessionPlan` + `explanation` (validate §81, persist `learning_plans/blocks`)
  - `POST /api/curriculum/replan` — `{currentPlan, livePerformance, learnerState}` → `UpdatedLearningPlan` (§92-93, chỉ sửa blocks còn lại)
  - `GET /api/curriculum/history` — plan history §114
  - `POST /api/curriculum/recommendation` — `getNextBestAction` (§18)

## Trạng thái phiên (FSM)

`idle → starting → listening/recording → transcribing → thinking → speaking → listening → ... → completed → idle` + `error`. Không dùng scattered booleans.

## Tests

- **Unit:** provider selection, FSM, transcript, exercise schema, difficulty model, deterministic metrics (TTFW/filler), bottleneck/pattern, pronunciation NA, mastery update/decay/retention/trend/promotion, skill graph prerequisites, plan validation duplicate, curriculum decision
- **Integration:** foundation + conversation + diagnostics pipeline + curriculum (short/long/replan, profile A/D/F, fast inaccurate, plateau) (§122-129)
- Chạy: `pnpm test` — 16 files, 82 tests pass (đã verify dev 3032: generate 5/10/30 min, replan, recommendation, learner state)

## Phase 2 — Foundation Highlights

- **22 exercise types** (§37): repeat, shadow, chunk_practice, pattern_practice, substitution, one_sentence, answer_expansion, controlled_speaking, timed_speaking, rapid_response, follow_up, stimulus_speaking, translation_bridge, vocabulary_activation, grammar_speaking, pronunciation_micro, confidence, recovery, self_correction, repeat_until_better, micro_monologue
- **Baseline 7 tasks** (§7-8) động, 8 metrics, levelSuggestion 0-10
- **Difficulty 8 chiều** (§41) → scalar 1-10 + AI-assisted
- **Levels 0-10** (§4), taxonomy 16 skills (§5)
- **Cơ chế:** WORD→CHUNK→PHRASE→SENTENCE (§9), chunk Recognize→Spontaneous (§10), pattern Imitate→Free (§11), substitution single→free (§12), shadowing 0.75/1/1.25x (§14), 3-second TTFW (§19), recovery, self-correction cues, filler (§34), translationDependency (§24), speech bank (§35)
- **Adaptive:** `too_easy/appropriate/too_hard` → ±1, freeze→recovery, success→expansion (§43), Daily 5-15&apos;
- **Scoring:** Practice Score 0-100 (§39), feedback 5 dòng §40

## Phase 3 — Conversation Highlights (§88)

- **14 modes** (§4): free, casual, daily_life, social, travel, workplace, professional, interview, debate, storytelling, presentation, random, ai_generated, custom — mỗi mode là config
- **Infinite scenario** (§18): `ScenarioBlueprint` — AI generate mỗi session, fingerprint dedup (§65)
- **Character** (§19-21): role/personality/style/mood/trust/patience/engagement — consistency §20, emotional update §21
- **World state** (§22): `currentObjective/topic, activeCharacter, facts, threads, activeEvents, turnCount, surprise/pressure` — session memory §23
- **Follow-up & branching** (§24-26): contextual follow-up, branching theo mention, 7 transition types
- **Event engine** (§28-30): 12 categories, trigger theo state/probability §29, có consequence §30
- **Controls** (§78): Mode/Difficulty/Duration/CharacterStyle/Surprise/Conflict/Pressure/Topic/Setting — all `Auto`, `Surprise Me` (§79) + `AI Create` (§80) + Goal UX (§81)

## Phase 4 — Diagnostics Highlights (§102)

- **8 dimensions** (§8): `fluency/grammar/vocabulary/naturalness/responseSpeed/pronunciation/communication/confidence` — separate Practice Score, pronunciation `-1` = `not_available`
- **9 analyzers hybrid** (§4, §54): Fluency (WPM/filler), ResponseSpeed (TTFW), Grammar (recurrenceKey), Vocabulary (active vs passive), Naturalness, Pronunciation (never fake), Communication, Confidence — deterministic + 2-4 AI calls gộp
- **Turn + Session aggregation** (§31-33): `TurnEvaluation` per turn → session `best/worst/variance`, `completeness` too_short/partial/sufficient/rich
- **Patterns** (§36, §39, §75-82): `past_tense_verb_form`, `production_automaticity_gap`, `over_monitoring`, `fast_but_inaccurate`, `short_answer`
- **Bottleneck** (§34-35): `priority = severity × recurrence × impact × confidence` + boost — không lấy lowest score
- **Snapshot** (§66): `topStrengths/topWeaknesses/primaryBottleneck/dimensions/recurringPatterns/recommendedSkills` compact cho Phase 5

## Phase 5 — Curriculum Highlights (§131)

- **LearnerState** (§4-6): `SpeakingProfile` 12 dims + `SkillState` 19 skills (mastery 0-1 §9, confidence §11, trend, retentionRisk §13, transfer controlled/guided/spontaneous §40), `LearnerStateSnapshot` compact §75 cho AI (goals/bottleneck/dimensions/skillPriorities/reviewCandidates)
- **Mastery** (§9-13): evidence-based `updateMastery` (performance × confidence), recency decay `exp(-0.03*days)` §12, `retentionRisk` từ `lastPracticedAt + mastery + frequency`, trend `improving/stable/declining` → `canPromote` (need 3× >0.75 + confidence 0.6 + 4 practices) / `shouldDemote`
- **Skill graph** (§8): `sentence_retrieval → construction → expansion → controlled → timed → rapid → conversation`, `recovery → resilience`, `arePrerequisitesSatisfied` check 0.5 threshold
- **Goal mapping** (§16-17): `GOAL_SKILL_MAP` (workplace→explaining/clarification/professional vocab), `reconcileGoalAndDiagnosis` — **ưu tiên user goal tuyệt đối** (per lựa chọn), AI diagnosis thành secondary + giải thích
- **Teacher engine** (§18-24): `getNextBestAction` deterministic fallback (weakest mastery + goal relevance + prerequisite + avoid repetition) → AI refinement via `NEXT_ACTION_SYSTEM` (compact snapshot, `learningActionSchema` validate), `buildLearningSession` (deterministic 60/20/10/10 distribution vs AI `SESSION_PLANNER_SYSTEM` 5-30 min), `replanSession` §92-93 (chỉ sửa blocks còn lại, struggle → insert support, excellent → skip easy)
- **Validation** (§79-81): `validateLearningPlan` (duration 3-60, blocks sum ±5, allowed types, difficulty 1-10, duplicate skill+type 3×) → AI propose → policy validate → persist, hard constraints override AI §80
- **Curriculum loop** (§50, §95, §132): `OBSERVE→DIAGNOSE→PRIORITIZE→PLAN→PRACTICE→EVALUATE→UPDATE→REPLAN`, post-session `updateSkillFromPerformance` + `updateLearnerStateFromEvaluation` + versioning §52 (`LearnerStateChange` field/previous/new/reason/sourceSessionId) + `CurriculumState` focus window §67 (hysteresis)
- **Just Practice** (§88): 1 click 10' mặc định (warmup 2' + drill 3' + controlled 3' + conversation remaining), `Why This?` panel §89 evidence-based, `Debug` view §109 (state, bottleneck, history JSON)

## Phase 6 — Advanced Highlights (§94)

- **25 modules** (§3): rapidResponse, pressureConversation, topicSwitching, unexpectedQuestion, deepFollowup, opinion, debate, persuasion, negotiation, storytelling, longForm, presentation, qaChallenge, interview, professional, clarification, resilience, ambiguity, escalation, reformulation (full flow §42), spontaneous, abstract, roleReversal, devilsAdvocate, highPressure — mỗi module là `AdvancedTrainingModule` chung engine §4
- **Session builder** (§77-78): warmup→spontaneous→topicSwitching→pressure→roleplay→challenge→cooldown, dynamic theo duration 5-30 min, AI composition (§87 model-agnostic)

## Phase 7 — Orchestration Highlights (§102)

- **ONE BRAIN** (§103): `AIOrchestrator.execute` (§43) + `TaskRegistry` 21 tasks (§5) + `Model Router` (§24 free-first, quality floor §79) + `Context Engine` (6 strategies §15) + `Prompt Registry` versioned (§20) + `Cache` (scenario/exercise persistent, conversation none) + `Retry` exponential backoff + `Fallback OFF` (§37) + `Telemetry` (requests/tokens/latency/cacheHit §50, debug view §59)

## Phase 8 — Progress Highlights (§120)

- **Long-term model** (§3): `LongTermLearnerProfile` (historicalSnapshots, skillHistory, dimensionHistory, milestones, interventionOutcomes, trendSummary, journey)
- **Immutable history** (§5) + **Dimension/Skill history** (§6-7): mastery/confidence/retentionRisk per skill, 8 dimensions over time (30d default, Recharts `LineChart` + `--chart-1..5`)
- **Trend engine** (§8-10): `improving|strongly_improving|stable|declining|volatile|plateau|insufficient_data` + confidence low/medium/high, moving average, variance, slope (§69), small-sample warning §70
- **Milestones** (§29-32): `first_30s/1min, streak 5, mastery 70%, roleplay, pressure success` — timeline Speaking Journey
- **Reports** (§36-39): 7/30/90d `ProgressReport` (headline, majorImprovements, persistentChallenges, milestones, nextFocus) — AI `weekly-report` prompt + cache period+version (§96), correlation-only language §101
- **Comparison** (§33, §75): first month vs current, custom periods, comparable-session logic §67, recording replay §34
- **Intervention effectiveness** (§46-48): exerciseType → delta mastery, personal learning insights
- **Privacy** (§87) + **Retention** (§86) configurable, **Data export/delete** (§84-85)

## Hạn chế & hoãn sang Phase 9+

- Chưa có auth (anonymous) — Phase 9 mới thêm nếu cần
- Chưa lưu audio thô (chỉ transcript, retention configurable)
- Context truncate đơn giản cho một số route cũ — Phase 8 dùng summarizer cho progress

## Extension points cho phase sau (§64)

- `lib/ai/interfaces/provider.ts` + `lib/foundation/engines/*` — Phase 5 thay `FoundationDifficultyEngine` → `AI Curriculum Engine` không rewrite exercise
- `lib/ai/models/catalog.ts` + `lib/foundation/skills/taxonomy.ts` — thêm skill/provider chỉ thêm catalog
- `lib/ai/routing/auto-resolver.ts` + `lib/foundation/difficulty/engine.ts` — AI-assisted isolated
- `lib/ai/prompts/` + `lib/foundation/prompts/` — versioned, single responsibility (§53)
- `stores/voice-session-store.ts` + `stores/foundation-store.ts` — `rawText` + `history` cho Phase 4 diagnostics
- `lib/db/sqlite-db.ts` — schema quản lý tập trung toàn bộ tables cho Sessions, Content Banks, Progress, Curriculum và Diagnostics

## Giấy phép

MIT
