import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This line tells Vite that '@' is a shortcut for the 'src' folder
      "@": path.resolve(__dirname, "./src"),
    },
  },
})