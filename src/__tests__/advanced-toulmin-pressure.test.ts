import { describe, it, expect } from "vitest";
import {
  analyzeToulminArgumentation,
  detectLogicalFallacies,
  calculateComposureMetrics,
  detectTransitionalBridging,
  getDefaultBlitzLimitSec,
} from "@/lib/advanced/toulmin-pressure.engine";

describe("Toulmin Argumentation Model & Pressure Blitz Engine", () => {
  describe("analyzeToulminArgumentation", () => {
    it("detects all 4 core Toulmin pillars (Claim, Data, Warrant, Rebuttal) with full score", () => {
      const speech =
        "I believe remote work increases productivity. For example, statistics show a 22% surge in output. This implies that employees experience fewer office distractions. However, critics may say team bonding suffers, but asynchronous check-ins mitigate this.";

      const result = analyzeToulminArgumentation(speech);

      expect(result.elementsFound).toContain("claim");
      expect(result.elementsFound).toContain("data");
      expect(result.elementsFound).toContain("warrant");
      expect(result.elementsFound).toContain("rebuttal");
      expect(result.toulminScore).toBe(100);
      expect(result.missingKeyElements).toHaveLength(0);
      expect(result.feedbackVi).toContain("Xuất sắc");
      expect(result.claimSnippet).toBeDefined();
      expect(result.dataSnippet).toBeDefined();
      expect(result.warrantSnippet).toBeDefined();
      expect(result.rebuttalSnippet).toBeDefined();
    });

    it("identifies missing Rebuttal and advises learner accordingly", () => {
      const speech =
        "In my view, renewable energy is essential. Research indicates that solar costs have dropped 70%. Consequently, governments can achieve net-zero faster.";

      const result = analyzeToulminArgumentation(speech);

      expect(result.elementsFound).toContain("claim");
      expect(result.elementsFound).toContain("data");
      expect(result.elementsFound).toContain("warrant");
      expect(result.elementsFound).not.toContain("rebuttal");
      expect(result.toulminScore).toBe(75);
      expect(result.missingKeyElements).toEqual(["rebuttal"]);
      expect(result.feedbackVi).toContain("Rebuttal");
    });

    it("identifies missing Data when learner provides only Claim and Warrant", () => {
      const speech =
        "We must adopt artificial intelligence because it significantly accelerates our engineering workflows.";

      const result = analyzeToulminArgumentation(speech);

      expect(result.elementsFound).toContain("claim");
      expect(result.elementsFound).toContain("warrant");
      expect(result.elementsFound).not.toContain("data");
      expect(result.missingKeyElements).toContain("data");
      expect(result.feedbackVi).toContain("Data");
    });

    it("handles empty or blank speech gracefully", () => {
      const result = analyzeToulminArgumentation("");
      expect(result.elementsFound).toEqual([]);
      expect(result.toulminScore).toBe(0);
      expect(result.missingKeyElements).toHaveLength(4);
    });

    it("rewards backing and qualifier bonus nuances", () => {
      const speech =
        "I contend that modern encryption is vital. For instance, data indicates cyber breaches rose 40%. Therefore security audits are mandatory. While some might argue the cost is high, prevention is cheaper. Under the framework of zero-trust architecture, systems are probably safer.";

      const result = analyzeToulminArgumentation(speech);
      expect(result.elementsFound).toContain("backing");
      expect(result.elementsFound).toContain("qualifier");
      expect(result.toulminScore).toBe(100);
    });
  });

  describe("detectLogicalFallacies", () => {
    it("detects False Dilemma fallacy", () => {
      const text = "We have only two options: either we replace the entire system or our business goes bankrupt.";
      const fallacies = detectLogicalFallacies(text);

      expect(fallacies.length).toBeGreaterThan(0);
      const falseDilemma = fallacies.find((f) => f.type === "false_dilemma");
      expect(falseDilemma).toBeDefined();
      expect(falseDilemma?.labelVi).toContain("False Dilemma");
    });

    it("detects Hasty Generalization fallacy", () => {
      const text = "Everyone knows that every single person prefers working from home without exception.";
      const fallacies = detectLogicalFallacies(text);

      const hasty = fallacies.find((f) => f.type === "hasty_generalization");
      expect(hasty).toBeDefined();
      expect(hasty?.explanationVi).toContain("mẫu thử");
    });

    it("detects Circular Reasoning fallacy", () => {
      const text = "Our proposed strategy works because it works, and it is correct because it is right.";
      const fallacies = detectLogicalFallacies(text);

      const circular = fallacies.find((f) => f.type === "circular_reasoning");
      expect(circular).toBeDefined();
      expect(circular?.severity).toBe("critical");
    });

    it("detects Ad Hominem attack", () => {
      const text = "You only say that because you are too ignorant to understand financial markets.";
      const fallacies = detectLogicalFallacies(text);

      const adHominem = fallacies.find((f) => f.type === "ad_hominem");
      expect(adHominem).toBeDefined();
      expect(adHominem?.severity).toBe("critical");
    });

    it("detects Straw Man distortion", () => {
      const text = "So basically you want to ignore all customer safety regulations and let everyone suffer.";
      const fallacies = detectLogicalFallacies(text);

      const straw = fallacies.find((f) => f.type === "strawman");
      expect(straw).toBeDefined();
    });

    it("detects Slippery Slope assertion", () => {
      const text = "If we allow this, then inevitably it will lead directly to the total destruction of our company.";
      const fallacies = detectLogicalFallacies(text);

      const slope = fallacies.find((f) => f.type === "slippery_slope");
      expect(slope).toBeDefined();
    });

    it("returns empty array for clean and rigorous reasoning", () => {
      const text = "Based on our Q3 metrics, customer satisfaction improved by 14% after implementing the feedback loop.";
      const fallacies = detectLogicalFallacies(text);
      expect(fallacies).toHaveLength(0);
    });
  });

  describe("calculateComposureMetrics", () => {
    it("awards S-grade for quick reaction under blitz time limit and stable speaking rate", () => {
      const metrics = calculateComposureMetrics({
        latencyMs: 1200,
        timeLimitMs: 3000,
        wpm: 135,
        hesitationCount: 0,
      });

      expect(metrics.grade).toBe("S");
      expect(metrics.score).toBeGreaterThanOrEqual(90);
      expect(metrics.pressureRatio).toBeLessThanOrEqual(0.6);
      expect(metrics.label).toContain("Bản Lĩnh Đỉnh Cao");
    });

    it("awards B or C grade when latency severely exceeds time limit with hesitations", () => {
      const metrics = calculateComposureMetrics({
        latencyMs: 8000,
        timeLimitMs: 3000,
        wpm: 60,
        hesitationCount: 5,
      });

      expect(["B", "C"]).toContain(metrics.grade);
      expect(metrics.score).toBeLessThan(70);
    });
  });

  describe("detectTransitionalBridging", () => {
    it("recognizes strategic pivot phrases", () => {
      const text = "That brings up an important point, and we should focus on the underlying customer churn.";
      const bridge = detectTransitionalBridging(text);

      expect(bridge.hasBridge).toBe(true);
      expect(bridge.bridgePhrase).toBe("That brings up an important point");
      expect(bridge.feedbackVi).toContain("Bridging");
    });

    it("returns hasBridge false when no transitional phrase is present", () => {
      const text = "We made $5 million in profits this quarter.";
      const bridge = detectTransitionalBridging(text);
      expect(bridge.hasBridge).toBe(false);
    });
  });

  describe("getDefaultBlitzLimitSec", () => {
    it("returns correct blitz limits across training module types", () => {
      expect(getDefaultBlitzLimitSec("rapidResponse")).toBe(3);
      expect(getDefaultBlitzLimitSec("pressureConversation")).toBe(5);
      expect(getDefaultBlitzLimitSec("highPressure")).toBe(5);
      expect(getDefaultBlitzLimitSec("debate")).toBe(6);
      expect(getDefaultBlitzLimitSec("longForm")).toBe(10);
      expect(getDefaultBlitzLimitSec("unknown")).toBe(8);
    });
  });
});
