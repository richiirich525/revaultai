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
    plugins: [
  react(),
  r2UploadPlugin(),
  checkoutPlugin(),
  webhookPlugin(),
  verifySessionPlugin(),
],
  };
});