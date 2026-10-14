import { describe, it, expect } from "vitest";
import {
  formatConciseMeaning,
  formatPartOfSpeech,
  lookupLexiconWord,
} from "@/lib/foundation/vocabulary/lexicon-db.service";
import fs from "fs";
import path from "path";

describe("Offline 103k Dictionary Lookup & Formatting", () => {
  describe("formatConciseMeaning", () => {
    it("cleans up double parenthetical notes and takes the first 2 concise definitions", () => {
      const raw =
        "((viết tắt) của Government man) (từ Mỹ,nghĩa Mỹ), (thông tục) nhân viên cục điều tra liên bang; người bảo vệ; thám tử tư";
      const formatted = formatConciseMeaning(raw);
      expect(formatted).not.toContain("((viết tắt)");
      expect(formatted).toContain("Nhân viên cục điều tra liên bang");
      expect(formatted.split(";").length).toBeLessThanOrEqual(2);
    });

    it("formats grumpy meaning cleanly", () => {
      const raw = "gắt gỏng; cục cằn";
      const formatted = formatConciseMeaning(raw);
      expect(formatted).toBe("Gắt gỏng; cục cằn");
    });

    it("formats annoyed meaning cleanly", () => {
      const raw = "bị trái ý, khó chịu, bực mình; bị quấy rầy, bị phiền hà";
      const formatted = formatConciseMeaning(raw);
      expect(formatted).toBe("Bị trái ý, khó chịu, bực mình; bị quấy rầy, bị phiền hà");
    });

    it("returns empty string for empty input", () => {
      expect(formatConciseMeaning("")).toBe("");
    });
  });

  describe("formatPartOfSpeech", () => {
    it("standardizes Vietnamese parts of speech to friendly bilingual labels", () => {
      expect(formatPartOfSpeech("tính từ")).toBe("Tính từ (adj)");
      expect(formatPartOfSpeech("danh từ")).toBe("Danh từ (noun)");
      expect(formatPartOfSpeech("ngoại động từ")).toBe("Động từ (verb)");
      expect(formatPartOfSpeech("nội động từ")).toBe("Động từ (verb)");
      expect(formatPartOfSpeech("phó từ")).toBe("Trạng từ (adv)");
      expect(formatPartOfSpeech("giới từ")).toBe("Giới từ (prep)");
      expect(formatPartOfSpeech("liên từ")).toBe("Liên từ (conj)");
      expect(formatPartOfSpeech("thán từ")).toBe("Thán từ (interj)");
    });

    it("standardizes English parts of speech", () => {
      expect(formatPartOfSpeech("adjective")).toBe("Tính từ (adj)");
      expect(formatPartOfSpeech("noun")).toBe("Danh từ (noun)");
      expect(formatPartOfSpeech("verb")).toBe("Động từ (verb)");
      expect(formatPartOfSpeech("adverb")).toBe("Trạng từ (adv)");
    });

    it("never displays raw generic 'word'", () => {
      expect(formatPartOfSpeech("word")).toBe("Từ vựng");
      expect(formatPartOfSpeech("")).toBe("Từ vựng");
    });
  });

  describe("103k Dictionary File Integrity", () => {
    it("verifies g.json contains 'grumpy' with expected definitions", () => {
      const gPath = path.join(process.cwd(), "public", "dictionary", "en-vi", "g.json");
      expect(fs.existsSync(gPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(gPath, "utf-8"));
      expect(data["grumpy"]).toBeDefined();
      expect(data["grumpy"][0]).toContain("gắt gỏng");
      expect(data["grumpy"][1]).toBe("tính từ");
    });

    it("verifies a.json contains 'annoyed' and 'alarm' with authentic IPA", () => {
      const aPath = path.join(process.cwd(), "public", "dictionary", "en-vi", "a.json");
      const data = JSON.parse(fs.readFileSync(aPath, "utf-8"));
      expect(data["annoyed"]).toBeDefined();
      expect(data["alarm"]).toBeDefined();
      // Ensure IPA field is no longer empty string
      expect(data["alarm"][2]).toMatch(/^\/.*\/$/);
      expect(data["annoyed"][2]).toMatch(/^\/.*\/$/);
    });

    it("verifies synchronous Oxford 5000 lookup works instantly for core words", () => {
      const match = lookupLexiconWord("peaceful");
      expect(match).not.toBeNull();
      expect(match?.word).toBe("peaceful");
      expect(match?.cefrLevel).toBe("B1");
      expect(match?.meaningVi).toBeTruthy();
    });
  });

  describe("Authentic Dictionary IPA Resolution Across Project", () => {
    it("resolves accurate dictionary IPA for complex and spoken vocabulary", async () => {
      const { getWordIpa } = await import("@/lib/foundation/shadowing/ipa-dictionary");
      
      expect(getWordIpa("schedule")).toBe("ˈskedʒuːl");
      expect(getWordIpa("entrepreneur")).toBe("ˌɑːntrəprəˈnɜːr");
      expect(getWordIpa("technology")).toBe("tekˈnɑːlədʒi");
      expect(getWordIpa("difficult")).toBe("ˈdɪfɪkəlt");
      expect(getWordIpa("formal")).toBe("ˈfɔːməl");
      expect(getWordIpa("algorithm")).toBe("ˈælgɜːrˌɪðəm");
    });

    it("correctly tokenizes sentence with accurate authentic IPA for each word", async () => {
      const { getSentenceWordsWithIpa } = await import("@/lib/foundation/shadowing/ipa-dictionary");
      const sentence = "Technology creates new opportunities for every entrepreneur.";
      const tokens = getSentenceWordsWithIpa(sentence);

      const techToken = tokens.find((t) => t.cleanWord === "technology");
      const oppToken = tokens.find((t) => t.cleanWord === "opportunities");
      const entToken = tokens.find((t) => t.cleanWord === "entrepreneur");

      expect(techToken).toBeDefined();
      expect(techToken?.ipa).toBe("tekˈnɑːlədʒi");
      expect(oppToken).toBeDefined();
      expect(oppToken?.ipa.length).toBeGreaterThan(0);
      expect(entToken).toBeDefined();
      expect(entToken?.ipa).toBe("ˌɑːntrəprəˈnɜːr");
    });

    it("verifies dict-lookup API route returns genuine dictionary IPA", async () => {
      const { GET } = await import("@/app/api/foundation/vocabulary/dict-lookup/route");
      const fakeReq = {
        url: "http://localhost:3000/api/foundation/vocabulary/dict-lookup?word=technology",
      } as any;

      const res = await GET(fakeReq);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.found).toBe(true);
      expect(data.word).toBe("technology");
      expect(data.ipa).toMatch(/^\/t[eɛ]kˈnɑː?lədʒi\/$/);
    });
  });
});
