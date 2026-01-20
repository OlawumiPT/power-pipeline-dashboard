export default defineConfig(({ mode }) => ({
  plugins: [react()],

  server: {
    port: 5173,
    // REMOVE the proxy section entirely for production
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },

  base: "/",
}));
