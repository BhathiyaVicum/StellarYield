import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/components/calculator/__tests__/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/components/calculator/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
      ],
      thresholds: {
        lines: 90,
        functions: 80,
        branches: 75,
        statements: 90,
      },
    },
  },
});
