import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: { jsx: "automatic" }, // permet de tester les composants serveur (JSX) sans import de React
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30000 },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Le paquet "server-only" lève une erreur hors du serveur Next : on le neutralise pour les tests.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts")
    }
  }
});
