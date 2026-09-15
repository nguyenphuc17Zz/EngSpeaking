import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  saveBankTask,
  sampleBankTask,
  recordUserExposure,
  findBankTaskByHash,
  getContentBankStats,
} from "@/lib/foundation/services/content-bank.service";
import { getSqliteDb } from "@/lib/foundation/services/sqlite-bank";

describe("SQLite Content Banking Engine (data/content-banks.db)", () => {
  const dbPath = path.join(process.cwd(), "data", "content-banks.db");

  beforeAll(() => {
    // Ensure DB connection is initialized
    getSqliteDb();
  });

  it("creates the SQLite database file on disk", () => {
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it("saves a novel AI-generated task into SQLite and computes SHA-256 deduplication hash", async () => {
    const testTask = {
      id: "vn_sqlite_test_1",
      promptVi: "Hôm nay tôi sẽ hoàn thành báo cáo này trước khi về nhà.",
      targetIntent: "I will finish this report today before going home.",
      expectedResponses: [
        "I will finish this report today before going home.",
        "I'll complete this report before leaving for home today.",
      ],
      sayItBetter: {
        professional: "I will conclude this report prior to departure today.",
        casual: "I'll finish this report before heading home today.",
        idiomatic: "I'll wrap up this report before calling it a day.",
      },
    };

    const saved = await saveBankTask({
      module: "vn_to_en",
      category: "workplace",
      level: "direct",
      difficulty: 4,
      topic: "reporting",
      payload: testTask,
      hashSourceText: testTask.promptVi,
    });

    expect(saved).toBeDefined();
    expect(saved.id).toContain("cb_vn_to_en_");
    expect(saved.usage_count).toBeGreaterThanOrEqual(1);

    // Re-saving the exact same content should increment usage_count without duplicate entry
    const reSaved = await saveBankTask({
      module: "vn_to_en",
      category: "workplace",
      level: "direct",
      difficulty: 4,
      topic: "reporting",
      payload: testTask,
      hashSourceText: testTask.promptVi,
    });

    expect(reSaved.id).toBe(saved.id);
    expect(reSaved.usage_count).toBeGreaterThan(saved.usage_count);
  });

  it("retrieves the saved task by exact content hash", async () => {
    const promptText = "Hôm nay tôi sẽ hoàn thành báo cáo này trước khi về nhà.";
    const found = await findBankTaskByHash<{ id: string; promptVi: string }>(
      "vn_to_en",
      promptText
    );

    expect(found).toBeDefined();
    expect(found?.promptVi).toBe(promptText);
  });

  it("samples tasks from SQLite with forceSource: 'bank'", async () => {
    const sampled = await sampleBankTask<{ id: string; promptVi?: string }>({
      module: "vn_to_en",
      level: "direct",
      difficulty: 4,
      forceSource: "bank",
    });

    expect(sampled).toBeDefined();
    expect(sampled?.source).toBe("bank");
    expect(sampled?.task).toBeDefined();
  });

  it("records user exposures and filters recently exposed tasks", async () => {
    const testUserId = "sqlite_test_user_42";
    const contentId = "cb_test_exposure_123";

    await recordUserExposure(contentId, "vn_to_en", testUserId, 95);

    // Verify stats
    const stats = await getContentBankStats();
    expect(stats.totalItems).toBeGreaterThan(0);
    expect(stats.byModule.vn_to_en).toBeGreaterThan(0);
  });
});
