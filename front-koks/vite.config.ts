import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { "process.env": {} },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["vkcreator.duckdns.org", "vkcreator.chickenkiller.com", "vkcreator.ddns.net"],
  },
});
