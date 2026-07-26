import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

/**
 * Bundle size measurement and comparison.
 *
 * Next.js emits the client JavaScript a browser actually downloads into
 * `.next/static`. Measuring that directory after a build gives a truthful
 * figure for what ships, without needing a bundler plugin: `@next/bundle-analyzer`
 * is built for interactive exploration of a single build, not for diffing two
 * of them in CI.
 *
 * Sizes are reported gzipped as well as raw, because gzip is what crosses the
 * wire and raw bytes routinely overstate the real cost of a change.
 *
 * The logic here is deliberately free of any CI or filesystem-layout
 * assumptions beyond the directory it is handed, so it can be unit tested
 * without running a build.
 */

/**
 * Next emits content-hashed filenames, so `main-abc123.js` and `main-def456.js`
 * are the same logical chunk across two builds. Stripping the hash lets files
 * be matched up instead of every build looking like a complete rewrite.
 *
 * Only hash-shaped segments are removed: at least eight characters of
 * lowercase hex or base36, which is what Next's build IDs and chunk hashes
 * look like. A chunk genuinely named `page` or `framework` is left alone.
 */
export const stripContentHash = (file) =>
  file
    .replace(/[-.][a-f0-9]{8,}(?=\.[a-z]+$)/gi, "")
    .replace(/[-.][a-z0-9]{16,}(?=\.[a-z]+$)/gi, "")
    // Build-id directories arrive without a leading slash, because paths are
    // relative to .next/static. Anchoring at the start as well as after a
    // slash is what makes _buildManifest.js match across builds instead of
    // showing as removed-and-added on every PR.
    .replace(/(^|\/)[a-zA-Z0-9_-]{21}\//g, "$1[buildId]/");

/** Recursively lists every `.js` file beneath `root`. */
const listJsFiles = async (root, prefix = "") => {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const found = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await listJsFiles(abs, rel)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      found.push(rel);
    }
  }
  return found;
};

/**
 * Measures every JavaScript file beneath `staticDir`.
 *
 * A missing directory yields an empty report rather than throwing: a base
 * branch that failed to build should produce "no baseline", not a crashed
 * workflow.
 */
export const measureBundle = async (staticDir) => {
  const relativePaths = await listJsFiles(staticDir);
  const files = [];

  for (const rel of relativePaths.sort()) {
    const abs = path.join(staticDir, rel);
    try {
      const info = await stat(abs);
      const contents = await readFile(abs);
      files.push({
        file: rel,
        bytes: info.size,
        gzipBytes: gzipSync(contents).length,
      });
    } catch {
      // A file that vanished mid-measurement is not worth failing over.
    }
  }

  return {
    files,
    totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
    totalGzipBytes: files.reduce((sum, f) => sum + f.gzipBytes, 0),
  };
};

/** Collapses a report to hash-stripped name → total gzip bytes. */
const byLogicalName = (report) => {
  const map = new Map();
  for (const file of report.files) {
    const key = stripContentHash(file.file);
    map.set(key, (map.get(key) ?? 0) + file.gzipBytes);
  }
  return map;
};

/**
 * Compares two reports.
 *
 * Changes are ordered by the absolute size of the change, so the entries that
 * matter appear first regardless of direction.
 */
export const diffBundles = (before, after) => {
  const beforeMap = byLogicalName(before);
  const afterMap = byLogicalName(after);
  const names = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const changes = [];
  for (const name of names) {
    const beforeGzip = beforeMap.get(name) ?? 0;
    const afterGzip = afterMap.get(name) ?? 0;
    if (beforeGzip === afterGzip) continue;

    changes.push({
      file: name,
      status: beforeGzip === 0 ? "added" : afterGzip === 0 ? "removed" : "changed",
      beforeGzip,
      afterGzip,
      deltaGzip: afterGzip - beforeGzip,
    });
  }

  changes.sort((a, b) => Math.abs(b.deltaGzip) - Math.abs(a.deltaGzip));

  const totalGzipBefore = before.totalGzipBytes;
  const totalGzipAfter = after.totalGzipBytes;

  return {
    totalGzipBefore,
    totalGzipAfter,
    totalGzipDelta: totalGzipAfter - totalGzipBefore,
    totalBytesBefore: before.totalBytes,
    totalBytesAfter: after.totalBytes,
    totalBytesDelta: after.totalBytes - before.totalBytes,
    // No baseline means no meaningful percentage; reporting Infinity or 100%
    // would both be misleading.
    percentChange:
      totalGzipBefore === 0
        ? null
        : ((totalGzipAfter - totalGzipBefore) / totalGzipBefore) * 100,
    changes,
  };
};

/** Human-readable byte size. */
export const formatBytes = (bytes) => {
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes} B`;
  if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/** Signed size, so a reader can tell growth from shrinkage at a glance. */
export const formatDelta = (bytes) => {
  if (bytes === 0) return "—";
  const sign = bytes > 0 ? "+" : "";
  return `${sign}${formatBytes(bytes)}`;
};

/**
 * Makes a filename safe inside a Markdown table cell and code span.
 *
 * Chunk names originate from files in the pull request branch, so they are
 * untrusted input: a pipe would end the table cell early and a backtick would
 * close the code span, either of which corrupts the rendered comment.
 */
const escapeTableCell = (value) =>
  String(value).replace(/\|/g, "\\|").replace(/`/g, "'");

/** Marker used to find and replace this workflow's previous comment. */
export const COMMENT_MARKER = "<!-- ossfolio-bundle-size-report -->";

/**
 * Renders the diff as the Markdown comment body.
 *
 * Leads with the headline total, because that is the number a reviewer
 * actually needs; the per-file table is supporting detail.
 */
export const renderMarkdownReport = (diff, options = {}) => {
  const maxRows = options.maxRows ?? 15;
  const threshold = options.thresholdBytes ?? 0;

  const lines = [COMMENT_MARKER, "## Bundle size report", ""];

  if (diff.totalGzipBefore === 0) {
    lines.push(
      "No baseline bundle was available for the base branch, so only the current total is shown.",
      "",
      `**Total (gzipped):** ${formatBytes(diff.totalGzipAfter)}`,
      "",
    );
    return lines.join("\n");
  }

  const percent =
    diff.percentChange === null
      ? "—"
      : `${diff.percentChange >= 0 ? "+" : ""}${diff.percentChange.toFixed(2)}%`;

  const verdict =
    diff.totalGzipDelta === 0
      ? "No change to the client bundle."
      : diff.totalGzipDelta > 0
        ? `Client bundle grew by **${formatBytes(diff.totalGzipDelta)}** gzipped.`
        : `Client bundle shrank by **${formatBytes(Math.abs(diff.totalGzipDelta))}** gzipped.`;

  lines.push(
    verdict,
    "",
    "| | Base | This PR | Change |",
    "| --- | ---: | ---: | ---: |",
    `| **Total (gzipped)** | ${formatBytes(diff.totalGzipBefore)} | ${formatBytes(diff.totalGzipAfter)} | ${formatDelta(diff.totalGzipDelta)} (${percent}) |`,
    `| Total (raw) | ${formatBytes(diff.totalBytesBefore)} | ${formatBytes(diff.totalBytesAfter)} | ${formatDelta(diff.totalBytesDelta)} |`,
    "",
  );

  const notable = diff.changes.filter(
    (change) => Math.abs(change.deltaGzip) >= threshold,
  );

  if (notable.length === 0) {
    lines.push("No individual chunk changed size.", "");
    return lines.join("\n");
  }

  const shown = notable.slice(0, maxRows);
  const hidden = notable.length - shown.length;

  lines.push(
    "<details>",
    `<summary>Per-chunk changes (${notable.length})</summary>`,
    "",
    "| Chunk | Base | This PR | Change |",
    "| --- | ---: | ---: | ---: |",
  );

  for (const change of shown) {
    // The suffix sits outside the code span: Markdown does not interpret
    // underscores inside backticks, so "_(new)_" would render literally.
    const suffix =
      change.status === "added"
        ? " _(new)_"
        : change.status === "removed"
          ? " _(removed)_"
          : "";
    lines.push(
      `| \`${escapeTableCell(change.file)}\`${suffix} | ${formatBytes(change.beforeGzip)} | ` +
        `${formatBytes(change.afterGzip)} | ${formatDelta(change.deltaGzip)} |`,
    );
  }

  if (hidden > 0) {
    lines.push("", `_…and ${hidden} more._`);
  }

  lines.push("", "</details>", "");
  lines.push(
    "<sub>Measured from `.next/static`, gzipped. Content hashes are stripped so chunks match across builds.</sub>",
  );

  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// CLI
//
// Two subcommands, so the workflow that builds the code and the workflow that
// posts the comment stay separate:
//
//   measure <staticDir> <outFile>          write a JSON report
//   report  <baseJson> <headJson> <outFile> write the Markdown comment
//
// The rendering happens here rather than in the commenting workflow, so that
// workflow never needs to check out or execute repository code — it only posts
// text it was handed.
// ---------------------------------------------------------------------------

import { fileURLToPath } from "node:url";
import process from "node:process";

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const readJson = async (file) => {
  try {
    return JSON.parse(await readFile(file, "utf-8"));
  } catch {
    // A missing or unreadable baseline is normal — the base branch may have
    // failed to build. Treat it as "no bundle" rather than crashing.
    return { files: [], totalBytes: 0, totalGzipBytes: 0 };
  }
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (command === "measure") {
    const [staticDir, outFile] = args;
    if (!staticDir || !outFile) {
      throw new Error("usage: bundle-size.mjs measure <staticDir> <outFile>");
    }
    const report = await measureBundle(staticDir);
    await writeFile(outFile, JSON.stringify(report, null, 2), "utf-8");
    console.log(
      `[bundle-size] ${report.files.length} JS files, ` +
        `${formatBytes(report.totalGzipBytes)} gzipped -> ${outFile}`,
    );
    return;
  }

  if (command === "report") {
    const [baseFile, headFile, outFile] = args;
    if (!baseFile || !headFile || !outFile) {
      throw new Error(
        "usage: bundle-size.mjs report <baseJson> <headJson> <outFile>",
      );
    }
    const diff = diffBundles(await readJson(baseFile), await readJson(headFile));
    await writeFile(outFile, renderMarkdownReport(diff), "utf-8");
    console.log(
      `[bundle-size] delta ${formatDelta(diff.totalGzipDelta)} gzipped -> ${outFile}`,
    );
    return;
  }

  throw new Error(`Unknown command: ${command ?? "(none)"}`);
};

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[bundle-size] ${error.message}`);
    process.exitCode = 1;
  });
}
