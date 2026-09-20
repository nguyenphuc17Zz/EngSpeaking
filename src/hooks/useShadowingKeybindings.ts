import { useEffect } from "react";

interface KeybindingHandlers {
  onTogglePlay?: () => void;
  onToggleRecord?: () => void;
  onPrevSegment?: () => void;
  onNextSegment?: () => void;
  onSetMarkerA?: () => void;
  onSetMarkerB?: () => void;
  onToggleLoop?: () => void;
  disabled?: boolean;
}

export function useShadowingKeybindings({
  onTogglePlay,
  onToggleRecord,
  onPrevSegment,
  onNextSegment,
  onSetMarkerA,
  onSetMarkerB,
  onToggleLoop,
  disabled = false,
}: KeybindingHandlers) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          onTogglePlay?.();
          break;
        case "KeyR":
          e.preventDefault();
          onToggleRecord?.();
          break;
        case "ArrowLeft":
        case "BracketLeft":
          e.preventDefault();
          onPrevSegment?.();
          break;
        case "Enter":
        case "ArrowRight":
        case "BracketRight":
          e.preventDefault();
          onNextSegment?.();
          break;
        case "KeyA":
          e.preventDefault();
          onSetMarkerA?.();
          break;
        case "KeyB":
          e.preventDefault();
          onSetMarkerB?.();
          break;
        case "KeyL":
          e.preventDefault();
          onToggleLoop?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    disabled,
    onTogglePlay,
    onToggleRecord,
    onPrevSegment,
    onNextSegment,
    onSetMarkerA,
    onSetMarkerB,
    onToggleLoop,
  ]);
}
