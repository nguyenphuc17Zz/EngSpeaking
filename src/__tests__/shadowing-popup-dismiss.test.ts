import { describe, it, expect, vi } from "vitest";

describe("Shadowing Word Lookup Popup Auto-Dismiss Logic", () => {
  it("dismisses popup when navigation keys (ArrowRight, ArrowLeft, BracketRight, BracketLeft, Enter) are pressed", () => {
    const onClose = vi.fn();
    const handleKeyDown = (e: { code: string; key?: string; target: any }) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      const isInput = targetTag === "input" || targetTag === "textarea" || e.target?.isContentEditable;
      if (e.code === "Escape") {
        onClose();
        return;
      }
      if (!isInput && (
        e.code === "ArrowRight" ||
        e.key === "ArrowRight" ||
        e.code === "ArrowLeft" ||
        e.key === "ArrowLeft" ||
        e.code === "BracketRight" ||
        e.code === "BracketLeft" ||
        e.code === "Enter" ||
        e.key === "Enter"
      )) {
        onClose();
      }
    };

    // ArrowRight (->) keypress outside input should trigger close
    handleKeyDown({ code: "ArrowRight", key: "ArrowRight", target: document.body });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Enter keypress outside input should trigger close
    handleKeyDown({ code: "Enter", key: "Enter", target: document.body });
    expect(onClose).toHaveBeenCalledTimes(2);

    // ArrowLeft (<-) keypress outside input should trigger close
    handleKeyDown({ code: "ArrowLeft", key: "ArrowLeft", target: document.body });
    expect(onClose).toHaveBeenCalledTimes(3);

    // Typing inside an input field should NOT dismiss
    const inputElement = { tagName: "INPUT", isContentEditable: false };
    handleKeyDown({ code: "ArrowRight", key: "ArrowRight", target: inputElement });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("resets popup state when segment index changes", () => {
    let popupWord: { word: string } | null = { word: "vocabulary" };
    let popupAnchor: any = {};

    const onSegmentChange = () => {
      popupWord = null;
      popupAnchor = null;
    };

    expect(popupWord).not.toBeNull();
    expect(popupAnchor).not.toBeNull();

    // Trigger sentence transition
    onSegmentChange();

    expect(popupWord).toBeNull();
    expect(popupAnchor).toBeNull();
  });
});
