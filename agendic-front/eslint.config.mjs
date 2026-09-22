import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// Import map from docs/agents/clean-architecture.md: each layer lists what it may import.
// A layer lists itself only where the map allows it (entities) or it's structurally needed
// (app, di, tests); `checkInternals` below makes same-layer imports subject to this map.
const ALLOWED_IMPORTS = {
  entities: ["entities"],
  ports: ["entities"],
  "use-cases": ["entities", "ports"],
  controllers: ["entities", "ports", "use-cases"],
  infrastructure: ["entities", "ports"],
  di: ["entities", "ports", "use-cases", "controllers", "infrastructure", "di"],
  app: ["entities", "di", "app"],
  tests: ["entities", "ports", "use-cases", "controllers", "infrastructure", "di", "app", "tests"],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/elements": [
        { type: "entities", pattern: "src/entities", partialMatch: false },
        { type: "ports", pattern: "src/application/{repositories,services}", partialMatch: false },
        { type: "use-cases", pattern: "src/application/use-cases", partialMatch: false },
        { type: "controllers", pattern: "src/interface-adapters/controllers", partialMatch: false },
        { type: "infrastructure", pattern: "src/infrastructure", partialMatch: false },
        { type: "di", pattern: "di", partialMatch: false },
        { type: "app", pattern: "app", partialMatch: false },
        { type: "tests", pattern: "tests", partialMatch: false },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        2,
        {
          default: "disallow",
          checkInternals: true,
          policies: Object.entries(ALLOWED_IMPORTS).map(([from, to]) => ({
            from: { element: { type: from } },
            allow: { to: { element: { type: to } } },
          })),
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
