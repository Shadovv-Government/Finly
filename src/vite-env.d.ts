/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Server-side env vars only — no VITE_ prefixed secrets
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
