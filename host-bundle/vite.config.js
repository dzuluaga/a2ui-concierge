import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/shim.js",
      name: "A2UIHost",
      formats: ["iife"],
      fileName: () => "a2ui-host.iife.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
