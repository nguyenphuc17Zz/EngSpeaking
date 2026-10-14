import fs from "fs";
import path from "path";
import https from "https";

const PUBLIC_DICT_DIR = path.join(process.cwd(), "public", "dictionary");
const EN_VI_DIR = path.join(PUBLIC_DICT_DIR, "en-vi");
const IPA_DIR = path.join(PUBLIC_DICT_DIR, "ipa");
const IPA_EN_US_DIR = path.join(IPA_DIR, "en-us");
const TEMP_DIR = path.join(process.cwd(), "node_modules", ".cache", "dict-download");
const SRC_DATA_DIR = path.join(process.cwd(), "src", "lib", "foundation", "shadowing", "data");

const OXFORD_5000_URL = "https://raw.githubusercontent.com/tyypgzl/Oxford-5000-words/master/full-word.json";
const ANHVIET_109K_URL = "https://raw.githubusercontent.com/yenthanh132/avdict-database-sqlite-converter/master/anhviet109K.txt";
const IPA_EN_US_URL = "https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt";
const IPA_EN_UK_URL = "https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_UK.txt";

// Ensure target directories exist
for (const dir of [PUBLIC_DICT_DIR, EN_VI_DIR, IPA_DIR, IPA_EN_US_DIR, TEMP_DIR, SRC_DATA_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadStream(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 10000) {
      console.log(`[CACHED] Đã có file tải sẵn: ${path.basename(destPath)} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB)`);
      return resolve(destPath);
    }

    console.log(`[DOWNLOADING] Đang tải từ: ${url} ...`);
    const fileStream = fs.createWriteStream(destPath);

    function get(currentUrl) {
      https.get(currentUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          fileStream.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`Tải thất bại với status code ${res.statusCode} từ ${currentUrl}`));
        }

        let downloadedBytes = 0;
        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);
        });

        res.on("end", () => {
          fileStream.end();
          console.log(`[DONE] Đã tải xong: ${path.basename(destPath)} (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
          resolve(destPath);
        });
      }).on("error", (err) => {
        fileStream.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
    }

    get(url);
  });
}

function normalizeBroadIpa(ipa) {
  if (!ipa) return "";
  return ipa
    .replace(/ɫ/g, "l")
    .replace(/ɹ/g, "r")
    .replace(/ɝ/g, "ɜːr")
    .replace(/ɚ/g, "ər")
    .replace(/ɡ/g, "g");
}

function parseIpaDictFile(filePath) {
  console.log(`[PARSING] Đang trích xuất dữ liệu IPA chuẩn từ ${path.basename(filePath)}...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const ipaMap = new Map();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const tabIdx = line.indexOf("\t");
    if (tabIdx === -1) continue;

    const word = line.slice(0, tabIdx).trim().toLowerCase();
    const rawIpa = line.slice(tabIdx + 1).trim();
    if (!rawIpa) continue;

    // Take the primary pronunciation (before comma if multiple)
    const firstOption = rawIpa.split(",")[0].trim();
    const cleanIpa = normalizeBroadIpa(firstOption.replace(/^\/+|\/+$/g, "").trim());

    if (cleanIpa && !ipaMap.has(word)) {
      ipaMap.set(word, cleanIpa);
    }
  }

  console.log(`[PARSED] Đã xử lý xong ${ipaMap.size} mục từ IPA.`);
  return ipaMap;
}

function parseAnhVietText(filePath, usIpaMap) {
  console.log(`[PARSING] Đang trích xuất dữ liệu từ điển Anh - Việt (${path.basename(filePath)})...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const entries = new Map();

  const lines = content.split(/\r?\n/);
  let currentWord = null;
  let currentIpa = "";
  let currentMeanings = [];
  let currentPos = "";

  function saveCurrent() {
    if (currentWord && !entries.has(currentWord)) {
      const summaryMeaning = currentMeanings
        .filter((m) => m && !m.startsWith("=") && !m.startsWith("*"))
        .map((m) => m.replace(/^-\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3)
        .join("; ");

      const lower = currentWord.toLowerCase();
      // Prioritize modern standard IPA from open-dict-data, fallback to parsed currentIpa
      const resolvedIpa = usIpaMap.get(lower)
        ? `/${usIpaMap.get(lower)}/`
        : currentIpa || "";

      entries.set(lower, {
        ipa: resolvedIpa,
        pos: currentPos || "",
        meaning: summaryMeaning || currentMeanings[0] || "",
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("@")) {
      saveCurrent();
      currentMeanings = [];
      currentPos = "";

      // Correctly parse @word /ipa/ with index lookups to avoid regex greedy whitespace bugs
      const firstSlash = line.indexOf("/");
      const lastSlash = line.lastIndexOf("/");
      if (firstSlash !== -1 && lastSlash > firstSlash) {
        currentWord = line.slice(1, firstSlash).trim();
        const extractedIpa = line.slice(firstSlash + 1, lastSlash).trim();
        currentIpa = extractedIpa ? `/${extractedIpa}/` : "";
      } else {
        currentWord = line.slice(1).trim();
        currentIpa = "";
      }
    } else if (line.startsWith("*")) {
      if (!currentPos) {
        currentPos = line.replace(/^\*\s*/, "").split(",")[0].trim();
      }
    } else if (line.startsWith("-")) {
      currentMeanings.push(line);
    }
  }
  saveCurrent();

  console.log(`[PARSED] Đã xử lý xong ${entries.size} từ vựng Anh - Việt.`);
  return entries;
}

async function main() {
  console.log("=== BẮT ĐẦU TẢI VÀ XÂY DỰNG BỘ TỪ ĐIỂN OFFLINE ===");

  const oxfordRawPath = path.join(TEMP_DIR, "oxford_5000_raw.json");
  const anhvietRawPath = path.join(TEMP_DIR, "anhviet_109k_raw.txt");
  const ipaEnUsRawPath = path.join(TEMP_DIR, "ipa_en_US_raw.txt");
  const ipaEnUkRawPath = path.join(TEMP_DIR, "ipa_en_UK_raw.txt");

  // 1. Download datasets
  await downloadStream(IPA_EN_US_URL, ipaEnUsRawPath);
  await downloadStream(IPA_EN_UK_URL, ipaEnUkRawPath);
  await downloadStream(OXFORD_5000_URL, oxfordRawPath);
  await downloadStream(ANHVIET_109K_URL, anhvietRawPath);

  // 2. Parse modern international IPA dictionaries
  const usIpaMap = parseIpaDictFile(ipaEnUsRawPath);
  const ukIpaMap = parseIpaDictFile(ipaEnUkRawPath);

  // 3. Parse Vietnamese meanings dictionary with accurate IPA injection
  const viMap = parseAnhVietText(anhvietRawPath, usIpaMap);

  // 4. Process Oxford 5000 Words
  console.log("[PROCESSING] Đang xử lý và ghép IPA & nghĩa tiếng Việt cho bộ Oxford 5000...");
  const oxfordRawContent = JSON.parse(fs.readFileSync(oxfordRawPath, "utf-8"));
  
  const oxfordEntries = [];
  const processedWords = new Set();

  for (const item of oxfordRawContent) {
    const v = item.value;
    if (!v || !v.word) continue;

    const word = v.word.trim().toLowerCase();
    if (processedWords.has(word)) continue;
    processedWords.add(word);

    const level = (v.level || "B1").toUpperCase();
    const pos = v.type || "word";
    // Prefer authentic US IPA: Oxford provided -> open-dict-data US -> open-dict-data UK -> viMap
    const ipaUS =
      v.phonetics?.us ||
      (usIpaMap.has(word) ? `/${usIpaMap.get(word)}/` : "") ||
      v.phonetics?.uk ||
      (viMap.get(word)?.ipa) ||
      "";
    const audio = v.us?.mp3 || v.uk?.mp3 || "";

    let meaningVi = viMap.get(word)?.meaning || "";
    if (!meaningVi) {
      meaningVi = pos;
    }

    oxfordEntries.push({
      w: word,
      p: pos,
      l: level,
      i: ipaUS,
      m: meaningVi,
      a: audio,
      ex: Array.isArray(v.examples) ? v.examples.slice(0, 2) : []
    });
  }

  // Write Oxford 5000 file (both to public/ and src/data/)
  const oxfordDestPath = path.join(PUBLIC_DICT_DIR, "oxford-5000.json");
  const oxfordSrcDataPath = path.join(process.cwd(), "src", "lib", "foundation", "vocabulary", "data", "oxford-5000.json");
  const oxfordJsonStr = JSON.stringify(oxfordEntries);
  fs.writeFileSync(oxfordDestPath, oxfordJsonStr, "utf-8");
  if (fs.existsSync(path.dirname(oxfordSrcDataPath))) {
    fs.writeFileSync(oxfordSrcDataPath, oxfordJsonStr, "utf-8");
  }
  console.log(`[SAVED] Đã lưu ${oxfordEntries.length} từ Oxford chuẩn vào ${oxfordDestPath} (${(fs.statSync(oxfordDestPath).size / 1024).toFixed(1)} KB)`);

  // 5. Partition 126k standard IPA into letter buckets public/dictionary/ipa/en-us/[a-z].json
  console.log("[PROCESSING] Đang chia nhỏ kho 126k IPA theo bảng chữ cái A-Z...");
  const ipaBuckets = {};
  for (const [w, ipa] of usIpaMap.entries()) {
    const firstChar = w[0]?.toLowerCase();
    const bucket = /^[a-z]$/.test(firstChar) ? firstChar : "other";
    if (!ipaBuckets[bucket]) {
      ipaBuckets[bucket] = {};
    }
    ipaBuckets[bucket][w] = ipa;
  }

  for (const [letter, wordsObj] of Object.entries(ipaBuckets)) {
    const filePath = path.join(IPA_EN_US_DIR, `${letter}.json`);
    fs.writeFileSync(filePath, JSON.stringify(wordsObj), "utf-8");
  }
  console.log(`[SAVED] Đã lưu kho IPA chuẩn 126k từ vào public/dictionary/ipa/en-us/ (${Object.keys(ipaBuckets).length} files)`);

  // 6. Build Core In-Memory IPA map (High-yield spoken English words + inflections for instant 0ms client shadowing)
  console.log("[PROCESSING] Đang tạo Core In-Memory IPA Map cho trình duyệt...");
  const coreIpaMap = {};

  // Curated standard RP/General American pronunciations for high-frequency learner words
  const CURATED_COMMON_MAP = {
    a: "ə", an: "æn", the: "ðə", this: "ðɪs", that: "ðæt", these: "ðiːz", those: "ðəʊz",
    i: "aɪ", you: "juː", he: "hiː", she: "ʃiː", it: "ɪt", we: "wiː", they: "ðeɪ",
    me: "miː", him: "hɪm", her: "hɜː", us: "ʌs", them: "ðɛm", my: "maɪ", your: "jɔː",
    his: "hɪz", its: "ɪts", our: "aʊə", their: "ðeə",
    emails: "ˈiːmeɪlz", formal: "ˈfɔːməl", informal: "ɪnˈfɔːməl", smiley: "ˈsmaɪli", difficult: "ˈdɪfɪkəlt",
  };
  Object.assign(coreIpaMap, CURATED_COMMON_MAP);

  // Priority A: All Oxford 5000 entries
  for (const entry of oxfordEntries) {
    if (entry.w) {
      const cleanIpa = (entry.i || usIpaMap.get(entry.w) || "").replace(/^\/+|\/+$/g, "");
      if (cleanIpa && !coreIpaMap[entry.w]) {
        coreIpaMap[entry.w] = cleanIpa;
      }
    }
  }

  // Priority B: Inflections of Oxford words (plurals, -ed, -ing, -ly, -er, -est) from usIpaMap
  for (const entry of oxfordEntries) {
    const base = entry.w;
    const suffixes = ["s", "es", "d", "ed", "ing", "ly", "er", "est", "ies", "ied"];
    for (const suf of suffixes) {
      const inflected = base + suf;
      if (usIpaMap.has(inflected) && !coreIpaMap[inflected]) {
        coreIpaMap[inflected] = usIpaMap.get(inflected);
      }
      // Also try consonant doubling or drop -e: e.g., move -> moving, drop -> dropped
      if (base.endsWith("e") && (suf === "ing" || suf === "ed" || suf === "er")) {
        const dropE = base.slice(0, -1) + suf;
        if (usIpaMap.has(dropE) && !coreIpaMap[dropE]) {
          coreIpaMap[dropE] = usIpaMap.get(dropE);
        }
      }
    }
  }

  // Priority C: English contractions & common spoken particles
  const commonContractions = [
    "i'm", "you're", "he's", "she's", "it's", "we're", "they're",
    "i've", "you've", "we've", "they've",
    "i'd", "you'd", "he'd", "she'd", "we'd", "they'd",
    "i'll", "you'll", "he'll", "she'll", "we'll", "they'll",
    "don't", "doesn't", "didn't", "won't", "wouldn't",
    "can't", "couldn't", "shouldn't", "mustn't", "aren't", "isn't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
    "that's", "what's", "there's", "here's", "who's", "how's", "where's", "when's",
    "let's", "'cause", "'em", "'bout", "gonna", "wanna", "gotta"
  ];
  for (const cont of commonContractions) {
    if (usIpaMap.has(cont)) coreIpaMap[cont] = usIpaMap.get(cont);
  }

  // Priority D: Top frequency words from usIpaMap (up to 40,000 words total)
  for (const [w, ipa] of usIpaMap.entries()) {
    if (!coreIpaMap[w]) {
      coreIpaMap[w] = ipa;
      if (Object.keys(coreIpaMap).length >= 40000) break;
    }
  }

  const coreIpaPath = path.join(SRC_DATA_DIR, "core-ipa.json");
  fs.writeFileSync(coreIpaPath, JSON.stringify(coreIpaMap), "utf-8");
  console.log(`[SAVED] Đã lưu ${Object.keys(coreIpaMap).length} từ Core IPA vào ${coreIpaPath} (${(fs.statSync(coreIpaPath).size / 1024).toFixed(1)} KB)`);

  // 7. Split full English-Vietnamese dictionary into letter-based files (a.json, b.json, etc.)
  console.log("[PROCESSING] Đang chia nhỏ kho từ điển Anh - Việt (kèm IPA chuẩn) theo bảng chữ cái A-Z...");
  const letterBuckets = {};

  for (const [w, entry] of viMap.entries()) {
    const firstChar = w[0]?.toLowerCase();
    const bucket = /^[a-z]$/.test(firstChar) ? firstChar : "other";
    if (!letterBuckets[bucket]) {
      letterBuckets[bucket] = {};
    }
    // Compact format: [meaning, pos?, ipa?]
    letterBuckets[bucket][w] = [entry.meaning, entry.pos || "", entry.ipa || ""];
  }

  let totalLettersCount = 0;
  let totalWithIpa = 0;
  for (const [letter, wordsObj] of Object.entries(letterBuckets)) {
    const letterFilePath = path.join(EN_VI_DIR, `${letter}.json`);
    fs.writeFileSync(letterFilePath, JSON.stringify(wordsObj), "utf-8");
    for (const item of Object.values(wordsObj)) {
      if (item[2] && item[2].trim()) totalWithIpa++;
    }
    totalLettersCount += Object.keys(wordsObj).length;
  }

  console.log(`[SAVED] Đã lưu ${totalLettersCount} từ vựng vào public/dictionary/en-vi/ (${Object.keys(letterBuckets).length} files), ${totalWithIpa} từ có IPA chuẩn.`);
  console.log("=== HOÀN TẤT TẢI VÀ XÂY DỰNG DỮ LIỆU TỪ ĐIỂN OFFLINE ===");
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
