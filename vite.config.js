import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import r2UploadPlugin from "./server/r2UploadPlugin.js";
import checkoutPlugin from "./server/checkoutPlugin.js";
import webhookPlugin from "./server/webhookPlugin.js";
import verifySessionPlugin from "./server/verifySessionPlugin.js";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    // The ffmpeg.wasm build ships its own module worker and a 32 MB wasm
    // payload. Pre-bundling rewrites the worker's imports and breaks the dev
    // server, so leave both packages alone and let Vite serve them as-is.
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/core"],
    },
    plugins: [
  react(),
  r2UploadPlugin(),
  checkoutPlugin(),
  webhookPlugin(),
  verifySessionPlugin(),
],
  };
});