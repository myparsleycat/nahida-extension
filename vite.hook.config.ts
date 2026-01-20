import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, "src/content/xhr-interceptor.ts"),
            formats: ["iife"],
            name: "HookContent",
            fileName: () => "src/content/xhr-interceptor.js",
        },
        rollupOptions: {
            output: {
                extend: true,
            },
        },
    },
});
