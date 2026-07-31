import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// On the host the API is on localhost; inside compose it's the `api` service.
// docker-compose.yml sets VITE_API_PROXY_TARGET=http://api:3001.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // listen on 0.0.0.0 so the port is reachable from the container
    port: Number(process.env.PORT ?? 3000),
    proxy: {
      // The API has no global prefix (GET /health, not /api/health), so strip
      // /api on the way through.
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
