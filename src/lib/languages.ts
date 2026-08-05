export const LANG_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  PHP: '#4F5D95',
  'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#384d54',
} as const;

export type KnownLanguage = keyof typeof LANG_COLORS;

/**
 * Languages offered as filter options in the UI.
 *
 * Kept here beside LANG_COLORS so Explore and Discover filter on the same set
 * rather than maintaining separate lists that drift apart. Values are
 * capitalised to match what GitHub reports and what `profiles.top_languages`
 * stores — the filter is an exact array-containment match, so "typescript"
 * would find nothing.
 */
export const POPULAR_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'C++',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Dart',
  'Vue',
  'Svelte',
] as const;

export type PopularLanguage = (typeof POPULAR_LANGUAGES)[number];
