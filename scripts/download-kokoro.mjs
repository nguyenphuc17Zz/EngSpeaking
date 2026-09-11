import fs from "fs";
import path from "path";
import https from "https";

const BASE_DIR = path.join(process.cwd(), "models", "tts", "kokoro");
const MODEL_DIR = path.join(BASE_DIR, "onnx-community", "Kokoro-82M-ONNX");
const ONNX_DIR = path.join(MODEL_DIR, "onnx");
const VOICES_DIR = path.join(BASE_DIR, "voices");

const FILES_TO_DOWNLOAD = [
  {
    url: "https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main/onnx/model_quantized.onnx",
    dest: path.join(ONNX_DIR, "model_quantized.onnx"),
    desc: "Kokoro-82M Quantized ONNX Model (~92MB)",
  },
  {
    url: "https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main/config.json",
    dest: path.join(MODEL_DIR, "config.json"),
    desc: "Config JSON",
  },
  {
    url: "https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main/tokenizer.json",
    dest: path.join(MODEL_DIR, "tokenizer.json"),
    desc: "Tokenizer JSON",
  },
  {
    url: "https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main/tokenizer_config.json",
    dest: path.join(MODEL_DIR, "tokenizer_config.json"),
    desc: "Tokenizer Config JSON",
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`[SKIP] File already exists: ${dest}`);
      return resolve();
    }

    console.log(`[DOWNLOADING] ${url} -> ${dest}`);
    const file = fs.createWriteStream(dest);

    function get(reqUrl) {
      https
        .get(reqUrl, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            return get(response.headers.location);
          }
          if (response.statusCode !== 200) {
            fs.unlink(dest, () => {});
            return reject(new Error(`Failed to download ${reqUrl}: Status ${response.statusCode}`));
          }

          response.pipe(file);
          file.on("finish", () => {
            file.close(resolve);
          });
        })
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    }

    get(url);
  });
}

async function main() {
  console.log("=== Kokoro-82M Model Downloader ===");
  fs.mkdirSync(ONNX_DIR, { recursive: true });
  fs.mkdirSync(VOICES_DIR, { recursive: true });

  for (const item of FILES_TO_DOWNLOAD) {
    try {
      await downloadFile(item.url, item.dest);
      console.log(`[SUCCESS] ${item.desc}`);
    } catch (err) {
      console.error(`[ERROR] Failed to download ${item.desc}:`, err.message);
    }
  }

  console.log("\n Kokoro-82M models setup completed in models/tts/kokoro/!");
}

main();
