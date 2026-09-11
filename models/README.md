# Thư Mục Lưu Trữ AI Models Nội Bộ (Local & Offline Models)

Thư mục này được sử dụng để lưu trữ tập trung các tệp model weights, ONNX files, checkpoint và cấu hình của các mô hình AI offline trong dự án **EnglishSpeaking**.

---

## Cấu trúc thư mục quy chuẩn:

```
models/
├── tts/                      # Text-to-Speech models (giọng đọc mẫu offline)
│   └── kokoro/               # Kokoro-82M ONNX model (82M params, ~80MB)
│       ├── kokoro-v0_19.onnx # File weights chính
│       └── voices.json       # Tệp vector đặc trưng giọng đọc (af_heart, am_adam, ...)
└── stt/                      # Speech-to-Text models (nhận dạng giọng nói offline)
    └── whisper/              # Whisper ONNX models (tiny/base)
```

---

## Nguyên tắc:
1. Mọi model AI offline mới của dự án đều phải được tải và lưu trữ vào đúng thư mục con tương ứng trong `models/`.
2. Không lưu trữ các file nhị phân rải rác ngoài thư mục `models/`.
3. Không commit các file model weights dung lượng quá lớn vào Git (đã được cấu hình trong `.gitignore`).
