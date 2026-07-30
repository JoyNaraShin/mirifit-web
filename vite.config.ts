import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `vercel dev` 는 기동 시점에 buildCommand 를 1회 돌려 정적 산출물을 서빙한다 —
// Vite 를 띄우지 않으므로 src 수정이 dev 루프에 반영되지 않는다(실측).
// 그래서 화면 개발은 이 Vite 서버로 하고, /api 만 vercel dev 로 프록시한다.
//   터미널 1: pnpm --filter @pet-fit/engine build:watch   (엔진을 만질 때만)
//   터미널 2: pnpm dev:api      → vercel dev --listen 3999
//   터미널 3: pnpm dev:web      → vite (HMR) — 여기로 접속한다
const API_TARGET = process.env.PETFIT_API_TARGET ?? "http://localhost:3999";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
});
