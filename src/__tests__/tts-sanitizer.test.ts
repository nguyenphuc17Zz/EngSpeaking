import { describe, it, expect } from "vitest";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

describe("sanitizeTextForTTS", () => {
  it("converts blanks before punctuation into natural ellipsis", () => {
    const input = "Yesterday, I had to ______ to finish ______.";
    const output = sanitizeTextForTTS(input);
    expect(output).toBe("Yesterday, I had to, to finish...");
    expect(output).not.toContain("_");
    expect(output).not.toContain("underscore");
  });

  it("converts middle blanks into natural comma pauses", () => {
    const input = "I usually ______ in the morning.";
    const output = sanitizeTextForTTS(input);
    expect(output).toBe("I usually, in the morning.");
    expect(output).not.toContain("_");
  });

  it("handles blanks at the very end cleanly", () => {
    const input = "After work, I usually ______";
    const output = sanitizeTextForTTS(input);
    expect(output).toBe("After work, I usually,");
    expect(output).not.toContain("_");
  });

  it("handles clean text without changing its meaning", () => {
    const input = "I drink coffee every single day.";
    const output = sanitizeTextForTTS(input);
    expect(output).toBe("I drink coffee every single day.");
  });
});
