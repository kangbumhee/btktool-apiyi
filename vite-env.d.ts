/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NANO_BANANA_API_KEY?: string; // Deprecated
  readonly VITE_GROQ_API_KEY?: string; // Deprecated
  readonly VITE_IMGBB_API_KEY?: string; // Deprecated: imgbb 사용 안 함
  readonly VITE_TAVILY_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string; // 새로 추가
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_CLOUDINARY_API_KEY?: string;
  readonly VITE_CLOUDINARY_API_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
