import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig = require("eslint-config-next");

export default [
  ...nextConfig,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-duplicate-imports": "error",
    },
  },
];
