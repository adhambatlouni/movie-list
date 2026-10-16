import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  clearMocks: true,
  restoreMocks: true,
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  coverageProvider: "v8",
});
