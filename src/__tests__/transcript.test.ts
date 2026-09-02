import { describe, it, expect } from "vitest";
import { normalizeTranscript } from "@/lib/stt/service";
import { transcriptionResultSchema } from "@/lib/validation/schemas";

describe("Transcript normalization §16", () => {
  it("preserves raw transcription faithfully, only trims", () => {
    expect(normalizeTranscript("  Hello world  ")).toBe("Hello world");
    expect(normalizeTranscript("I am going to school.")).toBe("I am going to school.");
  });

  it("does not silently rewrite", () => {
    const raw = "He go to school yesterday";
    expect(normalizeTranscript(raw)).toBe(raw); // no grammar fix
  });

  it("validates transcription result schema", () => {
    const ok = transcriptionResultSchema.safeParse({ text: "hi", provider: "groq", model: "whisper-large-v3" });
    expect(ok.success).toBe(true);
    const bad = transcriptionResultSchema.safeParse({ text: 123, provider: "groq", model: "x" } as unknown as object);
    expect(bad.success).toBe(false);
  });
});
