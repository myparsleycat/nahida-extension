import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, "src/content/hui/xhr.ts"),
            formats: ["iife"],
            name: "HookContent",
            fileName: () => "src/content/hui/xhr.js",
        },
        rollupOptions: {
            output: {
                extend: true,
            },
        },
    },
});
