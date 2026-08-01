// Migration checks for `supabase/migrations/`.
//
// Plain JavaScript, run directly with `node` in CI, matching bundle-size.mjs —
// there is no tsx or ts-node in this project, so a .ts entry point could not be
// executed by a workflow.
//
// Three rules, each chosen because it is already satisfied by every migration in
// the repository. A check that fails on existing history is a check everyone
// learns to ignore.
//
// Deliberately NOT enforced: sqlfluff's default rule set. It reports 424
// violations across the current 20 migrations, almost all cosmetic (202 indent,
// 125 line-length, 51 spacing). Gating on that would turn the job permanently red
// and teach contributors to skip it. Syntax is validated separately by
// `sqlfluff parse`, which passes on all 20 today.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = 'supabase/migrations';
export const SCHEMA_FILE = 'supabase/schema.sql';

/**
 * Remove SQL comments before pattern matching.
 *
 * Without this, a line like `-- create table foo (...)` in a design note would be
 * read as a real table definition and demand an RLS policy that should not exist.
 */
export const stripComments = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

/**
 * Pull the ordering prefix out of a migration filename.
 *
 * Supabase orders migrations by this prefix, not by content or commit date, so
 * two files sharing one is genuinely ambiguous rather than merely untidy.
 */
export const parseVersion = (filename) => {
  const match = path.basename(filename).match(/^(\d{14})_/);
  return match ? match[1] : null;
};

/** Group migration filenames by version, returning only the collisions. */
export const findDuplicateVersions = (filenames) => {
  const byVersion = new Map();

  for (const filename of filenames) {
    const version = parseVersion(filename);
    if (!version) continue;
    const bucket = byVersion.get(version) ?? [];
    bucket.push(path.basename(filename));
    byVersion.set(version, bucket);
  }

  return [...byVersion.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([version, files]) => ({ version, files: files.sort() }))
    .sort((a, b) => a.version.localeCompare(b.version));
};

/** Table names introduced by `CREATE TABLE` statements in one migration. */
export const extractCreatedTables = (sql) => {
  const source = stripComments(sql);
  const pattern =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?/gi;

  return [...source.matchAll(pattern)].map((match) => match[1].toLowerCase());
};

/** Table names that have row level security switched on in one migration. */
export const extractRlsEnabledTables = (sql) => {
  const source = stripComments(sql);
  const pattern =
    /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?\s+enable\s+row\s+level\s+security/gi;

  return [...source.matchAll(pattern)].map((match) => match[1].toLowerCase());
};

/**
 * Tables created without row level security being enabled.
 *
 * The rule checks that RLS is *on*, not that policies exist. Several tables here
 * intentionally carry zero policies — `profile_snapshots` says so in a comment —
 * because the only writer is the server-side sync using the service-role key,
 * which bypasses RLS by design. RLS on with no policies denies anonymous access
 * outright, which is the stricter posture. Demanding policies would flag that
 * correct design as a violation.
 */
export const tablesMissingRls = (sql) => {
  const created = extractCreatedTables(sql);
  const enabled = new Set(extractRlsEnabledTables(sql));
  return created.filter((table) => !enabled.has(table));
};

/**
 * CONTRIBUTING.md requires a migration and the schema snapshot to move together,
 * so that `schema.sql` stays a truthful picture of the database.
 */
export const schemaSnapshotUpdated = (changedFiles) => {
  const normalised = changedFiles.map((file) => file.replace(/\\/g, '/'));
  const touchedMigration = normalised.some(
    (file) => file.startsWith(`${MIGRATIONS_DIR}/`) && file.endsWith('.sql'),
  );
  if (!touchedMigration) return { required: false, satisfied: true };

  return {
    required: true,
    satisfied: normalised.includes(SCHEMA_FILE),
  };
};

/**
 * Run every rule and return findings.
 *
 * Version collisions among files this pull request did not touch are reported as
 * warnings rather than errors. They are real problems, but failing a contributor's
 * unrelated pull request for pre-existing history is how a check gets disabled.
 */
export const lintMigrations = ({
  allMigrations,
  changedFiles,
  contentsByFile,
}) => {
  const errors = [];
  const warnings = [];

  const changedMigrations = changedFiles
    .map((file) => file.replace(/\\/g, '/'))
    .filter(
      (file) => file.startsWith(`${MIGRATIONS_DIR}/`) && file.endsWith('.sql'),
    );
  const changedBasenames = new Set(
    changedMigrations.map((file) => path.basename(file)),
  );

  for (const duplicate of findDuplicateVersions(allMigrations)) {
    const involvesThisPr = duplicate.files.some((file) =>
      changedBasenames.has(file),
    );
    const message = `Migration version ${duplicate.version} is used by ${duplicate.files.length} files: ${duplicate.files.join(', ')}. Supabase orders migrations by this prefix, so their apply order is undefined.`;
    (involvesThisPr ? errors : warnings).push(message);
  }

  for (const file of changedMigrations) {
    const sql = contentsByFile[file];
    if (sql === undefined) continue;

    const missing = tablesMissingRls(sql);
    for (const table of missing) {
      errors.push(
        `${file}: table "${table}" is created without row level security. Add \`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\`.`,
      );
    }
  }

  const snapshot = schemaSnapshotUpdated(changedFiles);
  if (snapshot.required && !snapshot.satisfied) {
    errors.push(
      `${MIGRATIONS_DIR}/ changed but ${SCHEMA_FILE} did not. CONTRIBUTING.md requires both in the same pull request so the schema snapshot stays accurate.`,
    );
  }

  return { errors, warnings };
};

/** Render findings as a GitHub step summary. */
export const renderReport = ({ errors, warnings }) => {
  const lines = ['## Migration checks', ''];

  if (errors.length === 0 && warnings.length === 0) {
    lines.push('No issues found.');
    return lines.join('\n');
  }

  if (errors.length > 0) {
    lines.push(`### Errors (${errors.length})`, '');
    for (const error of errors) lines.push(`- ${error}`);
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(`### Warnings (${warnings.length})`, '');
    lines.push(
      '_Pre-existing, and not caused by this pull request. Reported so they stay visible._',
      '',
    );
    for (const warning of warnings) lines.push(`- ${warning}`);
  }

  return lines.join('\n').trimEnd();
};

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const changedFiles = process.argv.slice(2).filter(Boolean);

  const entries = await readdir(MIGRATIONS_DIR).catch(() => []);
  const allMigrations = entries
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  const contentsByFile = {};
  for (const file of changedFiles) {
    const normalised = file.replace(/\\/g, '/');
    if (
      !normalised.startsWith(`${MIGRATIONS_DIR}/`) ||
      !normalised.endsWith('.sql')
    ) {
      continue;
    }
    contentsByFile[normalised] = await readFile(normalised, 'utf8').catch(
      () => undefined,
    );
  }

  const result = lintMigrations({
    allMigrations,
    changedFiles,
    contentsByFile,
  });
  const report = renderReport(result);

  console.log(report);

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}
