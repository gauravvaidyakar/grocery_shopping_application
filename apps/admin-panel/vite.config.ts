import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: mode === "production" ? "/admin/" : "/",
    plugins: [react()],
    server: {
      port: 5175,
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      globals: true,
    },
  };
});
