"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioPlayer } from "@/lib/audio/player";
import type { PlaybackState } from "@/types/audio";

export function useAudioPlayer() {
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const [state, setState] = useState<PlaybackState>("idle");
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      const p = createAudioPlayer();
      p.onStateChange(setState);
      p.onProgress((c, d) => { setCurrentMs(c); setDurationMs(d); });
      p.onEnded(() => setState("ended"));
      playerRef.current = p;
    }
    return playerRef.current!;
  }, []);

  const play = useCallback(async (blob: Blob) => {
    const p = getPlayer();
    await p.play(blob);
  }, [getPlayer]);

  const playUrl = useCallback(async (url: string) => {
    const p = getPlayer();
    await p.playUrl(url);
  }, [getPlayer]);

  const pause = useCallback(() => getPlayer().pause(), [getPlayer]);
  const resume = useCallback(() => getPlayer().resume(), [getPlayer]);
  const stop = useCallback(() => {
    getPlayer().stop();
    setCurrentMs(0);
  }, [getPlayer]);
  const seek = useCallback((ms: number) => getPlayer().seek(ms), [getPlayer]);

  useEffect(() => {
    return () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, []);

  return { state, currentMs, durationMs, play, playUrl, pause, resume, stop, seek };
}
