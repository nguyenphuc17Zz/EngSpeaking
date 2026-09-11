import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

async function main() {
  console.log("=== Whisper ONNX Model Downloader ===");
  const hfPath = require.resolve("@huggingface/transformers", { paths: [require.resolve("kokoro-js")] });
  const { pipeline, env } = require(hfPath);

  const localWhisperDir = path.join(process.cwd(), "models", "stt", "whisper");
  env.cacheDir = localWhisperDir;

  console.log(`Target directory: ${localWhisperDir}`);

  console.log("\n1. Checking/Downloading whisper-tiny.en (Quantized ~40MB)...");
  await pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny.en", {
    dtype: "q8",
    device: "cpu",
  });
  console.log("✓ whisper-tiny.en ready!");

  console.log("\n2. Checking/Downloading whisper-base.en (Quantized ~73MB)...");
  await pipeline("automatic-speech-recognition", "onnx-community/whisper-base.en", {
    dtype: "q8",
    device: "cpu",
  });
  console.log("✓ whisper-base.en ready!");

  console.log("\n Whisper ONNX models setup completed in models/stt/whisper/!");
}

main().catch((err) => {
  console.error("Error during download:", err);
  process.exit(1);
});
