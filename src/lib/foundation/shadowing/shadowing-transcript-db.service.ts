// Shadowing Transcripts Database Service (IndexedDB)
// Stores sentence segments, timestamps, translations, and IPA outside localStorage
// Eliminates the 5MB browser localStorage quota limit

import type { CorodomoSegment } from "./corodomo-presets";

const DB_NAME = "engspeak_shadowing_db";
const DB_VERSION = 1;
const STORE_NAME = "transcripts";

export interface StoredTranscript {
  youtubeId: string;
  segments: CorodomoSegment[];
  updatedAt: string;
}

// In-memory fallback map if IndexedDB is disabled or unavailable (e.g. in certain SSR/test contexts)
const memoryFallback = new Map<string, StoredTranscript>();

function isIndexedDbSupported(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

let dbInstancePromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!isIndexedDbSupported()) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }

  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "youtubeId" });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        dbInstancePromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      dbInstancePromise = null;
      reject(err);
    }
  });

  return dbInstancePromise;
}

/**
 * Save or update transcript segments for a video in IndexedDB
 */
export async function saveTranscript(
  youtubeId: string,
  segments: CorodomoSegment[]
): Promise<void> {
  if (!youtubeId) return;

  const entry: StoredTranscript = {
    youtubeId,
    segments: Array.isArray(segments) ? segments : [],
    updatedAt: new Date().toISOString(),
  };

  // Always mirror in memory fallback
  memoryFallback.set(youtubeId, entry);

  if (!isIndexedDbSupported()) return;

  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB saveTranscript warning (using memory fallback):", err);
  }
}

/**
 * Retrieve transcript segments for a video from IndexedDB
 */
export async function getTranscript(
  youtubeId: string
): Promise<CorodomoSegment[] | null> {
  if (!youtubeId) return null;

  if (!isIndexedDbSupported()) {
    const mem = memoryFallback.get(youtubeId);
    return mem ? mem.segments : null;
  }

  try {
    const db = await getDb();
    const result = await new Promise<StoredTranscript | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(youtubeId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (result && Array.isArray(result.segments) && result.segments.length > 0) {
      // Also sync into memory fallback
      memoryFallback.set(youtubeId, result);
      return result.segments;
    }

    const mem = memoryFallback.get(youtubeId);
    return mem ? mem.segments : null;
  } catch (err) {
    console.warn("IndexedDB getTranscript warning (using memory fallback):", err);
    const mem = memoryFallback.get(youtubeId);
    return mem ? mem.segments : null;
  }
}

/**
 * Delete a transcript from IndexedDB (e.g. when video is deleted)
 */
export async function deleteTranscript(youtubeId: string): Promise<void> {
  if (!youtubeId) return;

  memoryFallback.delete(youtubeId);

  if (!isIndexedDbSupported()) return;

  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(youtubeId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB deleteTranscript warning:", err);
  }
}

/**
 * Clear all transcripts from IndexedDB
 */
export async function clearAllTranscripts(): Promise<void> {
  memoryFallback.clear();

  if (!isIndexedDbSupported()) return;

  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB clearAllTranscripts warning:", err);
  }
}
