import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, "src/content/gamebanana/index.ts"),
            formats: ["iife"],
            name: "GameBananaEnhancedContent",
            fileName: () => "src/content/gamebanana/index.js",
        },
        rollupOptions: {
            output: {
                extend: true,
            },
        },
    },
});
