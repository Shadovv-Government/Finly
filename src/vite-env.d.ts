/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY: string | undefined;
  readonly VITE_AI_MODEL: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
