import { describe, it, expect } from "vitest";
import { getOrthographicSyllables } from "@/lib/foundation/vocabulary/syllable-chunker";

describe("Orthographic Syllable Chunker", () => {
  it("splits advantage into 3 readable syllables", () => {
    const res = getOrthographicSyllables("advantage", 3);
    expect(res).toEqual(["ad", "van", "tage"]);
  });

  it("splits decision into 3 readable syllables", () => {
    const res = getOrthographicSyllables("decision", 3);
    expect(res).toEqual(["de", "ci", "sion"]);
  });

  it("splits collaborate into 4 syllables", () => {
    const res = getOrthographicSyllables("collaborate", 4);
    expect(res.length).toBe(4);
    expect(res.join("")).toBe("collaborate");
  });

  it("handles 1-syllable words gracefully", () => {
    const res = getOrthographicSyllables("price", 1);
    expect(res).toEqual(["price"]);
  });

  it("splits multi-syllable words using algorithmic fallback when not in static map", () => {
    const res = getOrthographicSyllables("fantastic", 3);
    expect(res.length).toBe(3);
    expect(res.join("")).toBe("fantastic");
  });
});
