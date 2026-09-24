"use client";

import { useParams } from "next/navigation";
import { VoiceSessionWorkspace } from "@/components/voice/VoiceSessionWorkspace";

export default function VoiceScenarioDynamicPage() {
  const params = useParams();
  const rawId = params?.scenarioId;
  const scenarioId = Array.isArray(rawId) ? rawId[0] : rawId;

  return <VoiceSessionWorkspace initialScenarioId={scenarioId} />;
}
