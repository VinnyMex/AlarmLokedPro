/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  // Injected at container start by web/docker-entrypoint.sh from the
  // API_URL env var; undefined outside Docker (see public/runtime-config.js).
  __ALARMLOCK_API_URL__?: string;
}
