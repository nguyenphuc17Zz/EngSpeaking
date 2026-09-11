import { describe, it, expect, vi } from "vitest";
import {
  calculateSpeechRateWpm,
  calculateTypeTokenRatio,
  detectHesitations,
  getDiscourseStage,
  getScenarioTwist,
  evaluateTwistResolution,
  SmartVadStateController,
} from "@/lib/audio/smart-vad.engine";

describe("Live Session VAD, Discourse & Twist Algorithms", () => {
  describe("Speech Rate (WPM) Algorithm", () => {
    it("should calculate correct WPM for normal speech", () => {
      // 10 words in 5000ms (5s = 1/12 min) -> 10 * 12 = 120 WPM
      const text = "I am working on an important project for our company.";
      const wpm = calculateSpeechRateWpm(text, 5000);
      expect(wpm).toBe(120);
    });

    it("should return 0 for empty or whitespace text", () => {
      expect(calculateSpeechRateWpm("", 3000)).toBe(0);
      expect(calculateSpeechRateWpm("   ", 3000)).toBe(0);
    });

    it("should clamp WPM within realistic human speaking boundaries (0 - 300)", () => {
      const veryFastText = Array(100).fill("word").join(" ");
      const wpm = calculateSpeechRateWpm(veryFastText, 1000);
      expect(wpm).toBeLessThanOrEqual(300);
    });
  });

  describe("Lexical Diversity (Type-Token Ratio TTR)", () => {
    it("should return 100% for completely distinct words", () => {
      const text = "The quick brown fox jumps over lazy dog";
      const ttr = calculateTypeTokenRatio(text);
      expect(ttr).toBe(100);
    });

    it("should return low TTR for highly repetitive vocabulary", () => {
      const text = "yes yes yes yes yes yes yes yes yes yes";
      const ttr = calculateTypeTokenRatio(text);
      expect(ttr).toBe(10);
    });

    it("should return 0 for empty text", () => {
      expect(calculateTypeTokenRatio("")).toBe(0);
    });
  });

  describe("Hesitation & Filler Word Detector", () => {
    it("should detect filler words like um, uh, you know", () => {
      const text = "Um, I think, you know, we should uh proceed with this.";
      const result = detectHesitations(text);
      expect(result.fillerWordCount).toBeGreaterThanOrEqual(3);
      expect(result.fillersDetected).toContain("um");
      expect(result.fillersDetected).toContain("uh");
      expect(result.fillersDetected).toContain("you know");
    });

    it("should return 0 fillers for fluent natural response", () => {
      const text = "I managed the whole migration project within two months with high reliability.";
      const result = detectHesitations(text);
      expect(result.fillerWordCount).toBe(0);
      expect(result.fillersDetected).toHaveLength(0);
    });
  });

  describe("Discourse Stage FSM", () => {
    it("should map turn 1 to rapport stage", () => {
      expect(getDiscourseStage(1, 6)).toBe("rapport");
    });

    it("should map turn 2 to discovery stage", () => {
      expect(getDiscourseStage(2, 6)).toBe("discovery");
    });

    it("should map turn 3 and 4 to twist_conflict stage", () => {
      expect(getDiscourseStage(3, 6)).toBe("twist_conflict");
      expect(getDiscourseStage(4, 6)).toBe("twist_conflict");
    });

    it("should map turn 5 to negotiation stage", () => {
      expect(getDiscourseStage(5, 6)).toBe("negotiation");
    });

    it("should map turn 6 to resolution", () => {
      expect(getDiscourseStage(6, 6)).toBe("resolution");
    });
  });

  describe("Conversational Twist & Resolution Engine", () => {
    it("should return predefined twist for known scenario at trigger turn", () => {
      const twist = getScenarioTwist("tech_interview", 3);
      expect(twist).not.toBeNull();
      expect(twist?.id).toBe("twist_system_outage");
      expect(twist?.injectedAtTurn).toBe(3);
    });

    it("should return null if turn does not match injectedAtTurn", () => {
      const twist = getScenarioTwist("tech_interview", 1);
      expect(twist).toBeNull();
    });

    it("should resolve twist when user response contains problem-solving keywords", () => {
      const twist = getScenarioTwist("tech_interview", 3)!;
      const userResponse = "First we will prioritize and rollback, then mitigate the issue with backup systems and adjust the rollout.";
      const evaluation = evaluateTwistResolution(twist, userResponse);
      expect(evaluation.isResolved).toBe(true);
      expect(evaluation.feedbackVi).toContain("Bạn đã ứng biến");
    });

    it("should detect unresolved twist when user gives a response that is too short", () => {
      const twist = getScenarioTwist("tech_interview", 3)!;
      const userResponse = "Ok sure.";
      const evaluation = evaluateTwistResolution(twist, userResponse);
      expect(evaluation.isResolved).toBe(false);
      expect(evaluation.feedbackVi).toContain("quá ngắn");
    });
  });

  describe("SmartVadStateController", () => {
    it("should trigger onSilenceEndpoint after configured silence threshold", () => {
      vi.useFakeTimers();
      const onSilenceEndpoint = vi.fn();
      const onBargeIn = vi.fn();

      const controller = new SmartVadStateController({
        silenceThresholdMs: 1000,
        onSilenceEndpoint,
        onBargeIn,
      });

      controller.notifyInterimTranscript("Hello world", false);
      expect(onSilenceEndpoint).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(onSilenceEndpoint).not.toHaveBeenCalled();

      vi.advanceTimersByTime(600);
      expect(onSilenceEndpoint).toHaveBeenCalledTimes(1);

      controller.destroy();
      vi.useRealTimers();
    });

    it("should reset timer if user keeps speaking before silence threshold", () => {
      vi.useFakeTimers();
      const onSilenceEndpoint = vi.fn();
      const onBargeIn = vi.fn();

      const controller = new SmartVadStateController({
        silenceThresholdMs: 1000,
        onSilenceEndpoint,
        onBargeIn,
      });

      controller.notifyInterimTranscript("I think that", false);
      vi.advanceTimersByTime(800);

      // User utters more words
      controller.notifyInterimTranscript("I think that we should change it", false);
      vi.advanceTimersByTime(500);
      expect(onSilenceEndpoint).not.toHaveBeenCalled();

      vi.advanceTimersByTime(600);
      expect(onSilenceEndpoint).toHaveBeenCalledTimes(1);

      controller.destroy();
      vi.useRealTimers();
    });

    it("should trigger onBargeIn when user speaks while AI is speaking", () => {
      const onSilenceEndpoint = vi.fn();
      const onBargeIn = vi.fn();

      const controller = new SmartVadStateController({
        silenceThresholdMs: 1000,
        onSilenceEndpoint,
        onBargeIn,
      });

      controller.notifyInterimTranscript("Wait a second", true);
      expect(onBargeIn).toHaveBeenCalledTimes(1);

      controller.destroy();
    });
  });
});
