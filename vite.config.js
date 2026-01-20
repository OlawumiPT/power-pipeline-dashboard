export default defineConfig(({ mode }) => ({
  plugins: [react()],

  server: {
    port: 5173,
    // Only proxy in development mode
    proxy: mode === 'development' ? {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    } : undefined,
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },

  base: "/",
}));
