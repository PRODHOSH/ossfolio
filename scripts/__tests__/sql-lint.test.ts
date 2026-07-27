import { describe, it, expect } from "vitest";

// The script is plain JavaScript because CI runs it directly with `node` —
// there is no tsx or ts-node in this project, so a .ts entry point could not be
// executed by a workflow. Same arrangement as bundle-size.test.ts.
const {
  stripComments,
  parseVersion,
  findDuplicateVersions,
  extractCreatedTables,
  extractRlsEnabledTables,
  tablesMissingRls,
  schemaSnapshotUpdated,
  lintMigrations,
  renderReport,
} = await import("../sql-lint.mjs");

describe("parseVersion", () => {
  it("reads the 14-digit ordering prefix", () => {
    expect(parseVersion("20260726000000_add_achievement_unlocks.sql")).toBe(
      "20260726000000",
    );
  });

  it("works on a full path", () => {
    expect(parseVersion("supabase/migrations/20260520000001_initial.sql")).toBe(
      "20260520000001",
    );
  });

  it("returns null when there is no version prefix", () => {
    expect(parseVersion("schema.sql")).toBeNull();
    expect(parseVersion("2026_short.sql")).toBeNull();
  });
});

describe("findDuplicateVersions", () => {
  it("finds nothing when every version is distinct", () => {
    expect(
      findDuplicateVersions(["20260101000000_a.sql", "20260102000000_b.sql"]),
    ).toEqual([]);
  });

  it("reports a collision with both filenames", () => {
    expect(
      findDuplicateVersions([
        "20260726000000_a.sql",
        "20260726000000_b.sql",
        "20260727000000_c.sql",
      ]),
    ).toEqual([
      {
        version: "20260726000000",
        files: ["20260726000000_a.sql", "20260726000000_b.sql"],
      },
    ]);
  });

  it("ignores files without a version prefix", () => {
    expect(findDuplicateVersions(["schema.sql", "README.md"])).toEqual([]);
  });
});

describe("stripComments", () => {
  it("removes line comments", () => {
    expect(stripComments("-- create table ghost (x int);\nselect 1;")).not.toMatch(
      /ghost/,
    );
  });

  it("removes block comments", () => {
    expect(stripComments("/* create table ghost (x int); */ select 1;")).not.toMatch(
      /ghost/,
    );
  });
});

describe("extractCreatedTables", () => {
  it("finds a plain create", () => {
    expect(extractCreatedTables("create table profiles (id uuid);")).toEqual([
      "profiles",
    ]);
  });

  it("handles IF NOT EXISTS and a public. prefix", () => {
    expect(
      extractCreatedTables("CREATE TABLE IF NOT EXISTS public.snapshots (id int);"),
    ).toEqual(["snapshots"]);
  });

  it("handles quoted identifiers", () => {
    expect(extractCreatedTables('create table "public"."my_table" (id int);')).toEqual(
      ["my_table"],
    );
  });

  it("finds several tables in one migration", () => {
    expect(
      extractCreatedTables(
        "create table orgs (id int);\ncreate table org_members (id int);",
      ),
    ).toEqual(["orgs", "org_members"]);
  });

  it("does not treat a commented-out create as real", () => {
    expect(
      extractCreatedTables("-- create table ghost (id int);\ncreate table real (id int);"),
    ).toEqual(["real"]);
  });

  it("is case-insensitive and tolerant of extra whitespace", () => {
    expect(extractCreatedTables("CrEaTe   TABLE\n  Weird (id int);")).toEqual([
      "weird",
    ]);
  });
});

describe("extractRlsEnabledTables", () => {
  it("recognises the standard statement", () => {
    expect(
      extractRlsEnabledTables("alter table public.profiles enable row level security;"),
    ).toEqual(["profiles"]);
  });

  it("is case-insensitive and handles no schema prefix", () => {
    expect(
      extractRlsEnabledTables("ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;"),
    ).toEqual(["profiles"]);
  });

  it("does not match a disable statement", () => {
    expect(
      extractRlsEnabledTables("alter table profiles disable row level security;"),
    ).toEqual([]);
  });
});

describe("tablesMissingRls", () => {
  it("passes when every created table enables RLS", () => {
    const sql = `
      create table public.widgets (id int);
      alter table public.widgets enable row level security;
    `;
    expect(tablesMissingRls(sql)).toEqual([]);
  });

  it("flags a table created without RLS", () => {
    expect(tablesMissingRls("create table public.widgets (id int);")).toEqual([
      "widgets",
    ]);
  });

  it("flags only the table that is missing it", () => {
    const sql = `
      create table a (id int);
      create table b (id int);
      alter table a enable row level security;
    `;
    expect(tablesMissingRls(sql)).toEqual(["b"]);
  });

  it("passes a table with RLS on and no policies — that is a deliberate pattern here", () => {
    // profile_snapshots documents exactly this: RLS on, zero write policies,
    // because the only writer is the service-role background sync.
    const sql = `
      create table public.snapshots (id int);
      alter table public.snapshots enable row level security;
    `;
    expect(tablesMissingRls(sql)).toEqual([]);
  });
});

describe("schemaSnapshotUpdated", () => {
  it("is not required when no migration changed", () => {
    expect(schemaSnapshotUpdated(["src/lib/db.ts"])).toEqual({
      required: false,
      satisfied: true,
    });
  });

  it("is satisfied when both a migration and the snapshot changed", () => {
    expect(
      schemaSnapshotUpdated([
        "supabase/migrations/20260101000000_a.sql",
        "supabase/schema.sql",
      ]),
    ).toEqual({ required: true, satisfied: true });
  });

  it("is unsatisfied when only a migration changed", () => {
    expect(
      schemaSnapshotUpdated(["supabase/migrations/20260101000000_a.sql"]),
    ).toEqual({ required: true, satisfied: false });
  });

  it("normalises Windows path separators", () => {
    expect(
      schemaSnapshotUpdated([
        "supabase\\migrations\\20260101000000_a.sql",
        "supabase/schema.sql",
      ]),
    ).toEqual({ required: true, satisfied: true });
  });
});

describe("lintMigrations", () => {
  const clean = {
    allMigrations: ["20260101000000_a.sql", "20260102000000_b.sql"],
    changedFiles: [
      "supabase/migrations/20260102000000_b.sql",
      "supabase/schema.sql",
    ],
    contentsByFile: {
      "supabase/migrations/20260102000000_b.sql":
        "create table b (id int); alter table b enable row level security;",
    },
  };

  it("reports nothing for a well-formed migration", () => {
    expect(lintMigrations(clean)).toEqual({ errors: [], warnings: [] });
  });

  it("errors when a new table has no RLS", () => {
    const result = lintMigrations({
      ...clean,
      contentsByFile: {
        "supabase/migrations/20260102000000_b.sql": "create table b (id int);",
      },
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('table "b"');
    expect(result.errors[0]).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("errors when the schema snapshot was not updated alongside", () => {
    const result = lintMigrations({
      ...clean,
      changedFiles: ["supabase/migrations/20260102000000_b.sql"],
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("schema.sql");
  });

  it("errors on a version collision this pull request introduced", () => {
    const result = lintMigrations({
      allMigrations: ["20260101000000_a.sql", "20260101000000_b.sql"],
      changedFiles: [
        "supabase/migrations/20260101000000_b.sql",
        "supabase/schema.sql",
      ],
      contentsByFile: {
        "supabase/migrations/20260101000000_b.sql":
          "create table b (id int); alter table b enable row level security;",
      },
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("20260101000000");
    expect(result.warnings).toHaveLength(0);
  });

  it("only warns about a collision the pull request did not touch", () => {
    // A contributor editing an unrelated file should not inherit a red check for
    // history they had no part in.
    const result = lintMigrations({
      allMigrations: ["20260101000000_a.sql", "20260101000000_b.sql"],
      changedFiles: ["src/lib/db.ts"],
      contentsByFile: {},
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("20260101000000");
  });

  it("reports several problems at once rather than stopping at the first", () => {
    const result = lintMigrations({
      allMigrations: ["20260101000000_a.sql"],
      changedFiles: ["supabase/migrations/20260101000000_a.sql"],
      contentsByFile: {
        "supabase/migrations/20260101000000_a.sql":
          "create table a (id int); create table b (id int);",
      },
    });
    expect(result.errors).toHaveLength(3);
  });

  it("ignores changed files outside the migrations directory", () => {
    expect(
      lintMigrations({
        allMigrations: ["20260101000000_a.sql"],
        changedFiles: ["README.md", "src/lib/db.ts"],
        contentsByFile: {},
      }),
    ).toEqual({ errors: [], warnings: [] });
  });
});

describe("renderReport", () => {
  it("says so plainly when nothing is wrong", () => {
    expect(renderReport({ errors: [], warnings: [] })).toContain(
      "No issues found",
    );
  });

  it("lists errors with a count", () => {
    const out = renderReport({ errors: ["first", "second"], warnings: [] });
    expect(out).toContain("Errors (2)");
    expect(out).toContain("- first");
    expect(out).toContain("- second");
  });

  it("marks warnings as pre-existing so they are not mistaken for regressions", () => {
    const out = renderReport({ errors: [], warnings: ["old collision"] });
    expect(out).toContain("Warnings (1)");
    expect(out).toContain("Pre-existing");
  });
});
