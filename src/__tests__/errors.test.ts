import { describe, it, expect } from "vitest";
import { VoiceEngineError, VoiceErrorCode, toUserMessage, mapProviderErrorToCode } from "@/lib/errors/codes";

describe("Error normalization §29 §30", () => {
  it("maps permission denied to friendly VI message", () => {
    const e = new VoiceEngineError({ code: VoiceErrorCode.MICROPHONE_PERMISSION_DENIED, message: "NotAllowed" });
    expect(toUserMessage(e)).toContain("Microphone bị từ chối");
  });

  it("maps provider not configured gemini", () => {
    const e = new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: "", provider: "gemini" });
    expect(toUserMessage(e)).toContain("Gemini");
  });

  it("maps HTTP codes", () => {
    expect(mapProviderErrorToCode(401, "")).toBe(VoiceErrorCode.PROVIDER_NOT_CONFIGURED);
    expect(mapProviderErrorToCode(429, "quota")).toBe(VoiceErrorCode.QUOTA_ERROR);
    expect(mapProviderErrorToCode(500, "")).toBe(VoiceErrorCode.NETWORK_ERROR);
  });

  it("unknown error returns generic", () => {
    expect(toUserMessage(new Error("oops"))).toBe("oops");
  });
});
