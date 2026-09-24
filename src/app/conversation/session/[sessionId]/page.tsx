"use client";

import { useParams } from "next/navigation";
import { ConversationSessionView } from "@/components/conversation/ConversationSessionView";

export default function ConversationDynamicSessionPage() {
  const params = useParams();
  const rawId = params?.sessionId;
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;

  return <ConversationSessionView sessionId={sessionId} />;
}
