import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });
const project = (testEnvironment, extension) =>
  createJestConfig({
    displayName: testEnvironment,
    testEnvironment,
    testMatch: [`<rootDir>/src/**/*.test.${extension}`],
    clearMocks: true,
    restoreMocks: true,
    modulePathIgnorePatterns: ["<rootDir>/.next/"],
    moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  });

const config = async () => ({
  coverageProvider: "v8",
  projects: await Promise.all([
    project("node", "ts")(),
    project("jsdom", "tsx")(),
  ]),
});

export default config;
