import fs from "fs";
import path from "path";
import https from "https";

const PUBLIC_DICT_DIR = path.join(process.cwd(), "public", "dictionary");
const EN_VI_DIR = path.join(PUBLIC_DICT_DIR, "en-vi");
const TEMP_DIR = path.join(process.cwd(), "node_modules", ".cache", "dict-download");

const OXFORD_5000_URL = "https://raw.githubusercontent.com/tyypgzl/Oxford-5000-words/master/full-word.json";
const ANHVIET_109K_URL = "https://raw.githubusercontent.com/yenthanh132/avdict-database-sqlite-converter/master/anhviet109K.txt";

// Ensure target directories exist
for (const dir of [PUBLIC_DICT_DIR, EN_VI_DIR, TEMP_DIR]) {
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

function parseAnhVietText(filePath) {
  console.log(`[PARSING] Đang trích xuất dữ liệu từ điển Anh - Việt (${path.basename(filePath)})...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const entries = new Map();

  // Each word block begins with @word /ipa/
  // Example:
  // @abandon /ə'bændən/
  // * ngoại động từ
  // - từ bỏ, ruồng bỏ
  const lines = content.split(/\r?\n/);
  let currentWord = null;
  let currentIpa = "";
  let currentMeanings = [];
  let currentPos = "";

  function saveCurrent() {
    if (currentWord && !entries.has(currentWord)) {
      // Clean meanings: take first 2-3 concise meaning lines
      const summaryMeaning = currentMeanings
        .filter((m) => m && !m.startsWith("=") && !m.startsWith("*"))
        .map((m) => m.replace(/^-\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3)
        .join("; ");

      entries.set(currentWord.toLowerCase(), {
        ipa: currentIpa || "",
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

      // Format: @word /ipa/ or @word
      const match = line.match(/^@([^\/]+)(?:\s+\/(.*?)\/)?/);
      if (match) {
        currentWord = match[1].trim();
        currentIpa = match[2] ? `/${match[2].trim()}/` : "";
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

  // 1. Download datasets
  await downloadStream(OXFORD_5000_URL, oxfordRawPath);
  await downloadStream(ANHVIET_109K_URL, anhvietRawPath);

  // 2. Parse Vietnamese meanings dictionary
  const viMap = parseAnhVietText(anhvietRawPath);

  // 3. Process Oxford 5000 Words
  console.log("[PROCESSING] Đang xử lý và ghép nghĩa tiếng Việt cho bộ Oxford 5000...");
  const oxfordRawContent = JSON.parse(fs.readFileSync(oxfordRawPath, "utf-8"));
  
  // Clean & compact Oxford list:
  // [word, pos, cefr, ipaUS, meaningVi, audioUrl]
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
    const ipaUS = v.phonetics?.us || v.phonetics?.uk || (viMap.get(word)?.ipa) || "";
    const audio = v.us?.mp3 || v.uk?.mp3 || "";

    // Lookup Vietnamese meaning from parsed 109k dictionary
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

  // Write Oxford 5000 file
  const oxfordDestPath = path.join(PUBLIC_DICT_DIR, "oxford-5000.json");
  fs.writeFileSync(oxfordDestPath, JSON.stringify(oxfordEntries), "utf-8");
  console.log(`[SAVED] Đã lưu ${oxfordEntries.length} từ Oxford chuẩn vào ${oxfordDestPath} (${(fs.statSync(oxfordDestPath).size / 1024).toFixed(1)} KB)`);

  // 4. Split full English-Vietnamese dictionary into letter-based files (a.json, b.json, etc.)
  console.log("[PROCESSING] Đang chia nhỏ kho từ điển Anh - Việt theo bảng chữ cái A-Z...");
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
  for (const [letter, wordsObj] of Object.entries(letterBuckets)) {
    const letterFilePath = path.join(EN_VI_DIR, `${letter}.json`);
    fs.writeFileSync(letterFilePath, JSON.stringify(wordsObj), "utf-8");
    totalLettersCount += Object.keys(wordsObj).length;
  }

  console.log(`[SAVED] Đã chia lưu ${totalLettersCount} từ vựng vào thư mục public/dictionary/en-vi/ (${Object.keys(letterBuckets).length} files)`);
  console.log("=== HOÀN TẤT TẢI VÀ XÂY DỰNG DỮ LIỆU TỪ ĐIỂN OFFLINE ===");
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
