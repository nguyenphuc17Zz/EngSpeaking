"use client";

import { useEffect, useState } from "react";
import { Agentation } from "agentation";

export function AgentationWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Chỉ chạy ở môi trường development và sau khi client đã mount xong
  if (process.env.NODE_ENV !== "development" || !mounted) {
    return null;
  }

  return <Agentation />;
}
