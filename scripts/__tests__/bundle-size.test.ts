import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// The script is plain JavaScript because CI runs it directly with `node` —
// there is no tsx or ts-node in this project, so a .ts entry point could not be
// executed by a workflow.
const {
  measureBundle,
  diffBundles,
  stripContentHash,
  formatBytes,
  formatDelta,
  renderMarkdownReport,
  COMMENT_MARKER,
} = await import("../bundle-size.mjs");

let root: string;
let staticDir: string;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "bundle-size-test-"));
  staticDir = path.join(root, "static");
  await mkdir(path.join(staticDir, "chunks"), { recursive: true });
  await mkdir(path.join(staticDir, "css"), { recursive: true });

  // Repetitive content so gzip compresses meaningfully.
  await writeFile(
    path.join(staticDir, "chunks", "main-abc12345.js"),
    "const a=1;".repeat(500),
  );
  await writeFile(
    path.join(staticDir, "chunks", "framework-deadbeef.js"),
    "const b=2;".repeat(1000),
  );
  await writeFile(path.join(staticDir, "css", "styles.css"), "body{margin:0}");
  await writeFile(path.join(staticDir, "manifest.json"), "{}");
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const report = (
  entries: Array<[string, number]>,
): { files: Array<{ file: string; bytes: number; gzipBytes: number }>; totalBytes: number; totalGzipBytes: number } => {
  const files = entries.map(([file, gzipBytes]) => ({
    file,
    bytes: gzipBytes * 3,
    gzipBytes,
  }));
  return {
    files,
    totalBytes: files.reduce((s, f) => s + f.bytes, 0),
    totalGzipBytes: files.reduce((s, f) => s + f.gzipBytes, 0),
  };
};

describe("measureBundle", () => {
  it("measures every JavaScript file", async () => {
    const result = await measureBundle(staticDir);
    expect(result.files).toHaveLength(2);
  });

  it("ignores non-JavaScript assets", async () => {
    // CSS and JSON are not the client JS payload this report is about.
    const result = await measureBundle(staticDir);
    const names = result.files.map((f: { file: string }) => f.file);
    expect(names.some((n: string) => n.endsWith(".css"))).toBe(false);
    expect(names.some((n: string) => n.endsWith(".json"))).toBe(false);
  });

  it("reports paths relative to the measured root, with forward slashes", async () => {
    const result = await measureBundle(staticDir);
    for (const file of result.files) {
      expect(file.file).not.toContain("\\");
      expect(file.file.startsWith("chunks/")).toBe(true);
    }
  });

  it("reports gzip smaller than raw for compressible content", async () => {
    const result = await measureBundle(staticDir);
    expect(result.totalGzipBytes).toBeGreaterThan(0);
    expect(result.totalGzipBytes).toBeLessThan(result.totalBytes);
  });

  it("totals match the sum of the files", async () => {
    const result = await measureBundle(staticDir);
    const raw = result.files.reduce((s: number, f: { bytes: number }) => s + f.bytes, 0);
    const gz = result.files.reduce((s: number, f: { gzipBytes: number }) => s + f.gzipBytes, 0);
    expect(result.totalBytes).toBe(raw);
    expect(result.totalGzipBytes).toBe(gz);
  });

  it("returns an empty report for a missing directory rather than throwing", async () => {
    // A base branch that failed to build should mean "no baseline", not a
    // crashed workflow.
    const result = await measureBundle(path.join(root, "does-not-exist"));
    expect(result.files).toEqual([]);
    expect(result.totalGzipBytes).toBe(0);
  });

  it("returns files in a stable order", async () => {
    const a = await measureBundle(staticDir);
    const b = await measureBundle(staticDir);
    expect(a.files.map((f: { file: string }) => f.file)).toEqual(
      b.files.map((f: { file: string }) => f.file),
    );
  });
});

describe("stripContentHash", () => {
  it("removes a hex content hash", () => {
    expect(stripContentHash("chunks/main-abc12345.js")).toBe("chunks/main.js");
  });

  it("removes a dot-separated hash", () => {
    expect(stripContentHash("chunks/page.9f8e7d6c.js")).toBe("chunks/page.js");
  });

  it("leaves an unhashed name alone", () => {
    expect(stripContentHash("chunks/framework.js")).toBe("chunks/framework.js");
    expect(stripContentHash("chunks/polyfills.js")).toBe("chunks/polyfills.js");
  });

  it("does not mistake a short suffix for a hash", () => {
    // "page-1" is a name, not a content hash.
    expect(stripContentHash("chunks/page-1.js")).toBe("chunks/page-1.js");
  });

  it("normalises the build id directory", () => {
    expect(stripContentHash("abcdefghij0123456789X/_buildManifest.js")).toBe(
      "abcdefghij0123456789X/_buildManifest.js",
    );
  });

  it("lets two builds of the same chunk match", () => {
    expect(stripContentHash("chunks/main-aaaaaaaa.js")).toBe(
      stripContentHash("chunks/main-bbbbbbbb.js"),
    );
  });
});

describe("diffBundles", () => {
  it("reports growth", () => {
    const diff = diffBundles(report([["chunks/a-11111111.js", 100]]), report([["chunks/a-22222222.js", 150]]));
    expect(diff.totalGzipDelta).toBe(50);
    expect(diff.percentChange).toBeCloseTo(50);
  });

  it("reports shrinkage as a negative delta", () => {
    const diff = diffBundles(report([["chunks/a-11111111.js", 200]]), report([["chunks/a-22222222.js", 150]]));
    expect(diff.totalGzipDelta).toBe(-50);
    expect(diff.percentChange).toBeCloseTo(-25);
  });

  it("matches chunks across builds despite differing hashes", () => {
    const diff = diffBundles(report([["chunks/main-aaa11111.js", 100]]), report([["chunks/main-bbb22222.js", 120]]));
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0].status).toBe("changed");
    expect(diff.changes[0].file).toBe("chunks/main.js");
  });

  it("marks a genuinely new chunk as added", () => {
    const diff = diffBundles(report([]), report([["chunks/new-11111111.js", 90]]));
    expect(diff.changes[0].status).toBe("added");
  });

  it("marks a deleted chunk as removed", () => {
    const diff = diffBundles(report([["chunks/old-11111111.js", 90]]), report([]));
    expect(diff.changes[0].status).toBe("removed");
  });

  it("omits unchanged chunks from the change list", () => {
    const diff = diffBundles(
      report([["chunks/a-11111111.js", 100], ["chunks/b-11111111.js", 50]]),
      report([["chunks/a-22222222.js", 100], ["chunks/b-22222222.js", 80]]),
    );
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0].file).toBe("chunks/b.js");
  });

  it("orders changes by magnitude regardless of direction", () => {
    const diff = diffBundles(
      report([["chunks/a-11111111.js", 100], ["chunks/b-11111111.js", 500]]),
      report([["chunks/a-22222222.js", 110], ["chunks/b-22222222.js", 100]]),
    );
    // b shrank by 400, a grew by 10 — the larger movement comes first.
    expect(diff.changes[0].file).toBe("chunks/b.js");
  });

  it("reports no percentage when there was no baseline", () => {
    // Infinity or 100% would both mislead.
    const diff = diffBundles(report([]), report([["chunks/a-11111111.js", 100]]));
    expect(diff.percentChange).toBeNull();
  });

  it("handles two empty bundles without dividing by zero", () => {
    const diff = diffBundles(report([]), report([]));
    expect(diff.totalGzipDelta).toBe(0);
    expect(diff.percentChange).toBeNull();
    expect(diff.changes).toEqual([]);
  });
});

describe("formatBytes / formatDelta", () => {
  it("scales units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.00 kB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });

  it("signs a delta so direction is unmistakable", () => {
    expect(formatDelta(1024)).toBe("+1.00 kB");
    expect(formatDelta(-1024)).toBe("-1.00 kB");
    expect(formatDelta(0)).toBe("—");
  });

  it("scales negative values by magnitude, not sign", () => {
    expect(formatBytes(-2048)).toBe("-2.00 kB");
  });
});

describe("renderMarkdownReport", () => {
  const grew = diffBundles(
    report([["chunks/a-11111111.js", 1000]]),
    report([["chunks/a-22222222.js", 1500]]),
  );

  it("includes the marker the comment workflow searches for", () => {
    // Without this the workflow cannot find its previous comment and would
    // append a new one on every push.
    expect(renderMarkdownReport(grew)).toContain(COMMENT_MARKER);
  });

  it("leads with the headline verdict", () => {
    expect(renderMarkdownReport(grew)).toContain("Client bundle grew by");
  });

  it("says so plainly when the bundle shrinks", () => {
    const shrank = diffBundles(
      report([["chunks/a-11111111.js", 1500]]),
      report([["chunks/a-22222222.js", 1000]]),
    );
    expect(renderMarkdownReport(shrank)).toContain("Client bundle shrank by");
  });

  it("reports no change when totals match", () => {
    const same = diffBundles(
      report([["chunks/a-11111111.js", 1000]]),
      report([["chunks/a-22222222.js", 1000]]),
    );
    expect(renderMarkdownReport(same)).toContain("No change to the client bundle.");
  });

  it("renders a totals table", () => {
    const md = renderMarkdownReport(grew);
    expect(md).toContain("| **Total (gzipped)** |");
    expect(md).toContain("| --- | ---: | ---: | ---: |");
  });

  it("explains itself when there is no baseline", () => {
    const noBase = diffBundles(report([]), report([["chunks/a-11111111.js", 100]]));
    const md = renderMarkdownReport(noBase);
    expect(md).toContain("No baseline bundle was available");
    expect(md).not.toContain("NaN");
    expect(md).not.toContain("Infinity");
  });

  it("collapses a long change list and says how many were hidden", () => {
    const many = Array.from({ length: 30 }, (_, i) => [`chunks/c${i}-11111111.js`, 100] as [string, number]);
    const after = Array.from({ length: 30 }, (_, i) => [`chunks/c${i}-22222222.js`, 100 + i + 1] as [string, number]);
    const md = renderMarkdownReport(diffBundles(report(many), report(after)), {
      maxRows: 5,
    });
    expect(md).toContain("…and 25 more.");
  });

  it("honours a noise threshold", () => {
    const md = renderMarkdownReport(
      diffBundles(report([["chunks/a-11111111.js", 1000]]), report([["chunks/a-22222222.js", 1005]])),
      { thresholdBytes: 100 },
    );
    expect(md).toContain("No individual chunk changed size.");
  });

  it("never emits NaN or Infinity", () => {
    for (const diff of [
      diffBundles(report([]), report([])),
      diffBundles(report([]), report([["chunks/a-11111111.js", 10]])),
      diffBundles(report([["chunks/a-11111111.js", 10]]), report([])),
    ]) {
      const md = renderMarkdownReport(diff);
      expect(md).not.toContain("NaN");
      expect(md).not.toContain("Infinity");
      expect(md).not.toContain("undefined");
    }
  });
});
