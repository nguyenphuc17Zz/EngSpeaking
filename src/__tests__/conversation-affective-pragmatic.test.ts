import { describe, it, expect } from "vitest";
import {
  classifyPragmaticSpeechAct,
  computeAffectiveDeltas,
  checkHiddenObjectiveUnlock,
  detectFactContradictions,
} from "@/lib/conversation/engines/affective-pragmatic.engine";
import { applyStateUpdate } from "@/lib/conversation/engines/state-manager";
import type {
  CharacterState,
  ConversationWorldState,
  ConversationFact,
  ConversationAIResponse,
} from "@/types/conversation-world";

describe("Conversation Affective & Pragmatic Negotiation Engine", () => {
  describe("Pragmatic Speech Act Classifier", () => {
    it("should classify empathy and rapport statements accurately", () => {
      const text = "I completely understand your point of view and appreciate your feedback on this.";
      const res = classifyPragmaticSpeechAct(text);
      expect(res.act).toBe("empathy_rapport");
      expect(res.confidence).toBeGreaterThanOrEqual(0.8);
      expect(res.labelVi).toContain("Đồng Cảm");
    });

    it("should classify concessions and compromise proposals", () => {
      const text = "How about we meet halfway? What if we deliver the core features first and handle the rest later?";
      const res = classifyPragmaticSpeechAct(text);
      expect(res.act).toBe("concession_compromise");
      expect(res.labelVi).toContain("Thỏa Hiệp");
    });

    it("should classify assertive arguments backed by data/numbers", () => {
      const text = "Based on our analytics, user engagement increased by 35% after the recent update.";
      const res = classifyPragmaticSpeechAct(text);
      expect(res.act).toBe("assertive_evidence");
      expect(res.labelVi).toContain("Dẫn Chứng");
    });

    it("should classify strategic inquiries and clarification questions", () => {
      const text = "Could you clarify what the team expectations are for our next milestone?";
      const res = classifyPragmaticSpeechAct(text);
      expect(res.act).toBe("clarification_inquiry");
      expect(res.labelVi).toContain("Thăm Dò");
    });

    it("should classify counter-arguments and challenges", () => {
      const text = "I disagree with that proposal, however, because it is unrealistic for our timeline.";
      const res = classifyPragmaticSpeechAct(text);
      expect(res.act).toBe("counter_challenge");
      expect(res.labelVi).toContain("Phản Biện");
    });

    it("should classify short or uncertain responses as hedging/hesitant", () => {
      const text = "um, maybe";
      const res = classifyPragmaticSpeechAct(text);
      expect(res.act).toBe("hedging_hesitant");
      expect(res.labelVi).toContain("Rụt Rè");
    });
  });

  describe("Affective Delta Calculation", () => {
    const baseCharacter: CharacterState = {
      mood: "neutral",
      trust: 50,
      patience: 60,
      engagement: 50,
      defensiveness: 45,
      emotionalValence: 0.0,
    };

    it("should increase trust and decrease defensiveness for empathy move", () => {
      const deltas = computeAffectiveDeltas("empathy_rapport", baseCharacter);
      expect(deltas.deltaTrust).toBeGreaterThan(0);
      expect(deltas.deltaDefensiveness).toBeLessThan(0);
      expect(deltas.deltaValence).toBeGreaterThan(0);
    });

    it("should strongly soften defensiveness for concession/compromise", () => {
      const deltas = computeAffectiveDeltas("concession_compromise", baseCharacter);
      expect(deltas.deltaDefensiveness).toBeLessThanOrEqual(-8);
      expect(deltas.deltaTrust).toBeGreaterThanOrEqual(4);
    });

    it("should penalize patience and trust when user is hesitant", () => {
      const deltas = computeAffectiveDeltas("hedging_hesitant", baseCharacter);
      expect(deltas.deltaPatience).toBeLessThan(0);
      expect(deltas.deltaTrust).toBeLessThan(0);
    });

    it("should escalate defensiveness when counter-challenging a defensive character", () => {
      const defensiveChar: CharacterState = { ...baseCharacter, defensiveness: 65 };
      const deltas = computeAffectiveDeltas("counter_challenge", defensiveChar);
      expect(deltas.deltaDefensiveness).toBeGreaterThan(0);
      expect(deltas.deltaPatience).toBeLessThan(0);
    });
  });

  describe("Hidden Objective Unlocking", () => {
    const mockWorldState: ConversationWorldState = {
      scenario: {
        id: "sc_1",
        mode: "workplace",
        topic: "Sprint Planning",
        setting: "Office",
        character: { role: "Product Owner", personality: "Demanding", communicationStyle: "Direct" },
        userGoal: "Negotiate timeline",
        aiGoal: "Keep release date",
        difficulty: 7,
        context: "Tight deadline",
        possibleEvents: [],
        speakingObjectives: [
          { type: "primary", description: "Reach agreement on date" },
          { type: "hidden_equity", description: "Discover bonus incentives", hidden: true },
        ],
      },
      currentObjective: "Negotiate timeline",
      currentTopic: "Timeline",
      activeCharacter: {
        mood: "friendly",
        trust: 80, // High trust milestone
        patience: 70,
        engagement: 65,
        defensiveness: 25,
      },
      conversationFacts: [],
      unresolvedThreads: [],
      activeEvents: [],
      turnCount: 3,
      surpriseLevel: "medium",
      pressure: "normal",
    };

    it("should unlock hidden objective when trust reaches milestone", () => {
      const unlocked = checkHiddenObjectiveUnlock(mockWorldState, "concession_compromise");
      expect(unlocked).not.toBeNull();
      expect(unlocked?.hidden).toBe(true);
      expect(unlocked?.isUnlocked).toBe(true);
      expect(unlocked?.description).toContain("bonus incentives");
    });

    it("should not unlock when conditions are not met", () => {
      const lowTrustWorld: ConversationWorldState = {
        ...mockWorldState,
        activeCharacter: { ...mockWorldState.activeCharacter, trust: 30, defensiveness: 70 },
        turnCount: 1,
      };
      const unlocked = checkHiddenObjectiveUnlock(lowTrustWorld, "counter_challenge");
      expect(unlocked).toBeNull();
    });
  });

  describe("Fact Contradiction Detection", () => {
    it("should detect budget contradictions against recorded facts", () => {
      const facts: ConversationFact[] = [
        { id: "f1", fact: "Target budget is $10k for marketing", createdAt: new Date().toISOString() },
      ];
      const newUtterance = "We can allocate a budget of $25k for this campaign.";
      const contradiction = detectFactContradictions(newUtterance, facts);
      expect(contradiction).not.toBeNull();
      expect(contradiction).toContain("ngân sách");
    });

    it("should return null when there is no contradiction", () => {
      const facts: ConversationFact[] = [
        { id: "f1", fact: "Target budget is $10k for marketing", createdAt: new Date().toISOString() },
      ];
      const newUtterance = "We should prioritize features that align with our target budget of $10k.";
      const contradiction = detectFactContradictions(newUtterance, facts);
      expect(contradiction).toBeNull();
    });
  });

  describe("State Manager Integration (applyStateUpdate)", () => {
    it("should apply defensiveness, emotional valence, and dominantAct correctly", () => {
      const initialWorld: ConversationWorldState = {
        scenario: {
          id: "sc_2",
          mode: "interview",
          topic: "Tech Interview",
          setting: "Online",
          character: { role: "Interviewer", personality: "Professional", communicationStyle: "Direct" },
          userGoal: "Pass",
          aiGoal: "Evaluate",
          difficulty: 6,
          context: "Interview",
          possibleEvents: [],
          speakingObjectives: [
            { type: "hidden_lead", description: "Earn Lead Architect role offer", hidden: true },
          ],
        },
        currentObjective: "Pass",
        currentTopic: "Tech",
        activeCharacter: {
          mood: "neutral",
          trust: 50,
          patience: 60,
          engagement: 50,
          defensiveness: 50,
          emotionalValence: 0.0,
        },
        conversationFacts: [],
        unresolvedThreads: [],
        activeEvents: [],
        turnCount: 2,
        surpriseLevel: "medium",
        pressure: "normal",
      };

      const aiResponse: ConversationAIResponse = {
        responseText: "Thank you for the detailed architectural compromise.",
        pragmaticAct: "concession_compromise",
        stateUpdate: {
          trustChange: 10,
          patienceChange: 5,
          defensivenessChange: -15,
          emotionalValenceChange: 0.25,
          unlockedObjective: {
            type: "hidden_lead",
            description: "Earn Lead Architect role offer",
            hidden: true,
            isUnlocked: true,
          },
        },
      };

      const updatedWorld = applyStateUpdate(initialWorld, aiResponse);
      expect(updatedWorld.activeCharacter.trust).toBe(60);
      expect(updatedWorld.activeCharacter.patience).toBe(65);
      expect(updatedWorld.activeCharacter.defensiveness).toBe(35);
      expect(updatedWorld.activeCharacter.emotionalValence).toBe(0.25);
      expect(updatedWorld.activeCharacter.dominantAct).toBe("concession_compromise");

      // Verify objective unlocked in scenario
      const unlockedObj = updatedWorld.scenario.speakingObjectives.find((o) => o.type === "hidden_lead");
      expect(unlockedObj?.isUnlocked).toBe(true);
    });
  });
});
