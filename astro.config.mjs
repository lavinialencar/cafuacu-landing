import { defineConfig } from "astro/config";

// Site estático. A inscrição roda em functions/api/inscrever.js (Cloudflare Pages Function).
export default defineConfig({
  site: "https://cafuacu.com.br",
  trailingSlash: "never",
  build: { format: "file" },
});
