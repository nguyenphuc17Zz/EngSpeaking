import { describe, it, expect } from "vitest";
import { canTransition } from "@/features/voice-session/state/machine";

describe("Session FSM §17 §22", () => {
  it("allows valid transitions", () => {
    expect(canTransition("idle", "starting")).toBe(true);
    expect(canTransition("starting", "ready")).toBe(true);
    expect(canTransition("recording", "transcribing")).toBe(true);
    expect(canTransition("transcribing", "thinking")).toBe(true);
    expect(canTransition("thinking", "speaking")).toBe(true);
    expect(canTransition("speaking", "listening")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransition("idle", "speaking")).toBe(false);
    expect(canTransition("completed", "recording")).toBe(false);
    expect(canTransition("recording", "thinking")).toBe(false);
  });

  it("allows error from many states", () => {
    expect(canTransition("recording", "error")).toBe(true);
    expect(canTransition("thinking", "error")).toBe(true);
    expect(canTransition("speaking", "error")).toBe(true);
  });

  it("allows completed -> idle reset", () => {
    expect(canTransition("completed", "idle")).toBe(true);
  });
});
