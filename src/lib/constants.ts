
/**
 * The base URL for the GitHub REST API.
 * 
 * Overridable via environment variables for GitHub Enterprise support or local mock testing.
 * Automatically strips trailing slashes to ensure clean and safe URL concatenation across fetch clients.
 */
export const GITHUB_API_BASE = (process.env.GITHUB_API_BASE || 'https://api.github.com').replace(/\/+$/, '');
