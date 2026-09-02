// Normalized error codes per spec §29 (extended Phase 2)
export const VoiceErrorCode = {
  MICROPHONE_PERMISSION_DENIED: "MICROPHONE_PERMISSION_DENIED",
  MICROPHONE_UNAVAILABLE: "MICROPHONE_UNAVAILABLE",
  RECORDING_FAILED: "RECORDING_FAILED",
  PLAYBACK_FAILED: "PLAYBACK_FAILED",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  STT_FAILED: "STT_FAILED",
  AI_GENERATION_FAILED: "AI_GENERATION_FAILED",
  TTS_FAILED: "TTS_FAILED",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  MODEL_NOT_SUPPORTED: "MODEL_NOT_SUPPORTED",
  INVALID_PROVIDER_RESPONSE: "INVALID_PROVIDER_RESPONSE",
  NETWORK_ERROR: "NETWORK_ERROR",
  QUOTA_ERROR: "QUOTA_ERROR",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
  // Phase 2
  EXERCISE_GENERATION_FAILED: "EXERCISE_GENERATION_FAILED",
  EVALUATION_FAILED: "EVALUATION_FAILED",
  INVALID_EXERCISE: "INVALID_EXERCISE",
  BASELINE_FAILED: "BASELINE_FAILED",
  HINT_FAILED: "HINT_FAILED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
} as const;

export type VoiceErrorCodeType = (typeof VoiceErrorCode)[keyof typeof VoiceErrorCode];

export class VoiceEngineError extends Error {
  code: VoiceErrorCodeType;
  provider?: string;
  model?: string;
  statusCode?: number;
  raw?: unknown;
  retryable: boolean;

  constructor(opts: {
    code: VoiceErrorCodeType;
    message: string;
    provider?: string;
    model?: string;
    statusCode?: number;
    raw?: unknown;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = "VoiceEngineError";
    this.code = opts.code;
    this.provider = opts.provider;
    this.model = opts.model;
    this.statusCode = opts.statusCode;
    this.raw = opts.raw;
    this.retryable = opts.retryable ?? isRetryable(opts.code);
  }
}

function isRetryable(code: VoiceErrorCodeType): boolean {
  const retryable = [
    VoiceErrorCode.NETWORK_ERROR,
    VoiceErrorCode.TIMEOUT,
    VoiceErrorCode.PROVIDER_NOT_CONFIGURED,
    VoiceErrorCode.QUOTA_ERROR,
  ] as string[];
  return retryable.includes(code);
}

// User-friendly mapping §30
export function toUserMessage(error: unknown): string {
  if (error instanceof VoiceEngineError) {
    switch (error.code) {
      case VoiceErrorCode.MICROPHONE_PERMISSION_DENIED:
        return "Microphone bị từ chối. Vui lòng cho phép truy cập micro trong trình duyệt và thử lại.";
      case VoiceErrorCode.MICROPHONE_UNAVAILABLE:
        return "Không tìm thấy micro. Vui lòng kiểm tra thiết bị và kết nối micro.";
      case VoiceErrorCode.RECORDING_FAILED:
        return "Không thể ghi âm. Vui lòng thử lại.";
      case VoiceErrorCode.PLAYBACK_FAILED:
        return "Không thể phát âm thanh. Vui lòng thử lại.";
      case VoiceErrorCode.STT_FAILED:
        return "Không thể nhận dạng giọng nói. Vui lòng nói rõ hơn và thử lại.";
      case VoiceErrorCode.AI_GENERATION_FAILED:
        return "AI không phản hồi. Vui lòng thử lại sau giây lát.";
      case VoiceErrorCode.TTS_FAILED:
        return "Không thể tạo giọng nói. Bạn vẫn có thể đọc phản hồi dạng văn bản.";
      case VoiceErrorCode.PROVIDER_NOT_CONFIGURED:
        return providerNotConfiguredMessage(error.provider);
      case VoiceErrorCode.MODEL_NOT_SUPPORTED:
        return `Model không được hỗ trợ: ${error.model ?? ""}. Vui lòng chọn model khác trong Cài đặt.`;
      case VoiceErrorCode.QUOTA_ERROR:
        return "Đã hết quota của provider. Vui lòng kiểm tra billing hoặc đổi provider trong Cài đặt.";
      case VoiceErrorCode.TIMEOUT:
        return "Yêu cầu hết thời gian. Vui lòng kiểm tra mạng và thử lại.";
      case VoiceErrorCode.NETWORK_ERROR:
        return "Lỗi mạng. Vui lòng kiểm tra kết nối internet.";
      case VoiceErrorCode.INVALID_PROVIDER_RESPONSE:
        return "Phản hồi từ AI không hợp lệ. Vui lòng thử lại.";
      case VoiceErrorCode.EXERCISE_GENERATION_FAILED:
        return "Không thể tạo bài tập. Vui lòng thử lại.";
      case VoiceErrorCode.EVALUATION_FAILED:
        return "Không thể chấm điểm. Vui lòng thử lại.";
      case VoiceErrorCode.BASELINE_FAILED:
        return "Không thể tạo baseline. Vui lòng thử lại.";
      case VoiceErrorCode.HINT_FAILED:
        return "Không thể tạo gợi ý.";
      default:
        return "Đã xảy ra lỗi. Vui lòng thử lại.";
    }
  }
  if (error instanceof Error) return error.message || "Đã xảy ra lỗi không xác định.";
  return "Đã xảy ra lỗi không xác định.";
}

function providerNotConfiguredMessage(provider?: string): string {
  if (provider?.toLowerCase() === "gemini") return "Google Gemini chưa được cấu hình. Thêm GEMINI_API_KEY vào biến môi trường server.";
  if (provider?.toLowerCase() === "groq") return "Groq chưa được cấu hình. Thêm GROQ_API_KEY vào biến môi trường server.";
  if (provider) return `Provider "${provider}" chưa được cấu hình. Vui lòng kiểm tra biến môi trường.`;
  return "Provider chưa được cấu hình. Vui lòng kiểm tra Cài đặt.";
}

// Map HTTP/provider errors to normalized codes
export function mapProviderErrorToCode(status?: number, message?: string): VoiceErrorCodeType {
  if (!status && message?.toLowerCase().includes("network")) return VoiceErrorCode.NETWORK_ERROR;
  if (status === 401 || status === 403) return VoiceErrorCode.PROVIDER_NOT_CONFIGURED;
  if (status === 429) {
    if (message?.toLowerCase().includes("quota") || message?.toLowerCase().includes("billing")) return VoiceErrorCode.QUOTA_ERROR;
    return VoiceErrorCode.QUOTA_ERROR;
  }
  if (status === 408 || message?.toLowerCase().includes("timeout")) return VoiceErrorCode.TIMEOUT;
  if (status && status >= 500) return VoiceErrorCode.NETWORK_ERROR;
  return VoiceErrorCode.UNKNOWN;
}
