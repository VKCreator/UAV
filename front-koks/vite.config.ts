import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { "process.env": {} },
  server: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
