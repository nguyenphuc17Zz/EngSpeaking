import { z } from "zod";

// Validates AI responses before trusting them §31
export const textGenerationResultSchema = z.object({
  text: z.string(),
  provider: z.string(),
  model: z.string(),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
  finishReason: z.string().optional(),
});

export const transcriptionResultSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  durationMs: z.number().optional(),
  language: z.string().optional(),
  provider: z.string(),
  model: z.string(),
});

export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string().min(1),
    })
  ),
  systemInstruction: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
});

// Settings validation
export const providerSelectionSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
});

export const voiceEngineConfigSchema = z.object({
  conversation: providerSelectionSchema,
  stt: providerSelectionSchema,
  tts: providerSelectionSchema,
});

// Turn and session
export const conversationTurnSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  text: z.string(),
  timestamp: z.string(),
  audioRef: z.string().optional(),
  durationMs: z.number().optional(),
});
