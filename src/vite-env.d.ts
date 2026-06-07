/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  // Server-side env vars only — no VITE_ prefixed secrets
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
