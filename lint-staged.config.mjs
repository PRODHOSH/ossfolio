// lint-staged configuration.
//
// - ESLint --fix runs on staged JS/TS files (this project's linter/formatter; there is no Prettier).
// - Type-checking runs `tsc --noEmit` across the whole project, NOT on individual staged files:
//   passing filenames to tsc makes it ignore tsconfig.json (path aliases like `@/*`, jsx, strict
//   options), which would fail on almost every commit. The function form below returns a single
//   project-wide command and ignores the staged filenames lint-staged would otherwise append.
export default {
  "*.{js,jsx,ts,tsx}": "eslint --fix",
  "*.{ts,tsx}": () => "tsc --noEmit",
};
