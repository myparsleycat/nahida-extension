import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, "src/content/content.ts"),
            formats: ["iife"],
            name: "GameBananaEnhancedContent",
            fileName: () => "src/content/content.js",
        },
        rollupOptions: {
            output: {
                extend: true,
            },
        },
    },
});
