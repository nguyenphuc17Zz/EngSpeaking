import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settings-store";
import { stepTtsSpeed, SPEED_OPTIONS } from "@/components/common/GlobalSpeedSelector";

describe("Settings Store — Global TTS Speed", () => {
  beforeEach(() => {
    useSettingsStore.setState({ ttsSpeed: 1.0 });
  });

  it("has a default ttsSpeed of 1.0", () => {
    expect(useSettingsStore.getState().ttsSpeed).toBe(1.0);
  });

  it("updates ttsSpeed via setTtsSpeed", () => {
    useSettingsStore.getState().setTtsSpeed(0.75);
    expect(useSettingsStore.getState().ttsSpeed).toBe(0.75);

    useSettingsStore.getState().setTtsSpeed(1.25);
    expect(useSettingsStore.getState().ttsSpeed).toBe(1.25);
  });

  it("steps through speed levels accurately using stepTtsSpeed", () => {
    expect(stepTtsSpeed(0.6, "up").value).toBe(0.75);
    expect(stepTtsSpeed(0.75, "up").value).toBe(0.9);
    expect(stepTtsSpeed(0.9, "up").value).toBe(1.0);
    expect(stepTtsSpeed(1.0, "up").value).toBe(1.25);
    expect(stepTtsSpeed(1.25, "up").value).toBe(1.25); // clamped at max

    expect(stepTtsSpeed(1.25, "down").value).toBe(1.0);
    expect(stepTtsSpeed(1.0, "down").value).toBe(0.9);
    expect(stepTtsSpeed(0.9, "down").value).toBe(0.75);
    expect(stepTtsSpeed(0.75, "down").value).toBe(0.6);
    expect(stepTtsSpeed(0.6, "down").value).toBe(0.6); // clamped at min
  });
});

