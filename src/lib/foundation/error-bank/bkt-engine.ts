// Bayesian Knowledge Tracing (BKT) Engine for Spoken Language Acquisition
// Distinguishes genuine Knowledge Gaps from motor/fluency Slips under time pressure.

import type { GapType, MainErrorCategory } from "@/types/error-bank";

export interface BKTParameters {
  pL0: number; // Initial probability of mastery (default: 0.20)
  pT: number;  // Probability of learning on practice (transition, default: 0.22)
  pG: number;  // Probability of guessing correctly without mastery (default: 0.12)
  pS: number;  // Probability of slipping/mistake despite mastery (default: 0.18)
}

export const DEFAULT_BKT_PARAMS: BKTParameters = {
  pL0: 0.20,
  pT: 0.22,
  pG: 0.12,
  pS: 0.18,
};

export interface BKTUpdateResult {
  pMastery: number; // Updated P(L) in [0.0, 1.0]
  isSlip: boolean;  // True if mistake was classified as a slip under fluency stress
  gapType: GapType; // Refined gap diagnosis
}

/**
 * Updates Bayesian Knowledge Tracing state following a spoken attempt.
 */
export function computeBKTUpdate(params: {
  currentPMastery?: number;
  correct: boolean;
  category: MainErrorCategory;
  responseLatencyMs?: number;
  wasSelfCorrected?: boolean;
  retrySucceeded?: boolean;
  customParams?: Partial<BKTParameters>;
}): BKTUpdateResult {
  const cfg: BKTParameters = { ...DEFAULT_BKT_PARAMS, ...params.customParams };
  const prevPL = params.currentPMastery ?? cfg.pL0;
  const latency = params.responseLatencyMs ?? 2500;

  // Slip probability increases under extreme speaking speed or severe hesitation
  let effectiveSlip = cfg.pS;
  if (latency < 1600 || latency > 4200) {
    effectiveSlip = Math.min(0.35, cfg.pS * 1.5);
  }

  // Detect if this incorrect attempt was likely just a slip
  const isSlip =
    !params.correct &&
    prevPL >= 0.60 &&
    (params.wasSelfCorrected || params.retrySucceeded || latency < 1800);

  // 1. Posterior calculation P(L_t | Observation)
  let pLGivenObs: number;
  if (params.correct) {
    const numerator = prevPL * (1 - effectiveSlip);
    const denominator = numerator + (1 - prevPL) * cfg.pG;
    pLGivenObs = denominator > 0 ? numerator / denominator : prevPL;
  } else {
    const numerator = prevPL * effectiveSlip;
    const denominator = numerator + (1 - prevPL) * (1 - cfg.pG);
    pLGivenObs = denominator > 0 ? numerator / denominator : prevPL;
  }

  // 2. Transition step P(L_{t+1}) = P(L_t | Obs) + (1 - P(L_t | Obs)) * P(T)
  // If the user succeeded or engaged in self-correction, learning takes place
  const effectiveTransition = params.wasSelfCorrected || params.retrySucceeded ? cfg.pT * 1.3 : cfg.pT;
  let newPMastery = pLGivenObs + (1 - pLGivenObs) * effectiveTransition;
  newPMastery = Math.min(0.99, Math.max(0.01, Math.round(newPMastery * 1000) / 1000));

  // 3. Gap type diagnosis
  let gapType: GapType;
  if (params.category === "pronunciation") {
    gapType = "pronunciation_gap";
  } else if (newPMastery < 0.45) {
    gapType = "knowledge_gap";
  } else if (latency > 3200 || isSlip) {
    gapType = "retrieval_gap";
  } else {
    gapType = "production_gap";
  }

  return {
    pMastery: newPMastery,
    isSlip,
    gapType,
  };
}
