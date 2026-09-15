import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // I test unitari girano in ambiente node (logica pura, niente DOM).
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
