# Automated Release Workflow

This document outlines the GitHub Actions workflow designed for securely building, testing, and automatically creating GitHub releases for `ossfolio`.

## 🏗️ Architecture & Flow

To adhere to the **Principle of Least Privilege**, our GitHub Actions workflow separates the read-only build and test processes from the write-enabled release process. This guarantees that potentially untrusted code execution during `npm install` or test runs cannot tamper with repository releases or tags.

```mermaid
flowchart TD
    %% Trigger
    TagPush([Push git tag v*]) --> TriggerWorkflow[Trigger Release Workflow]

    %% Read-Only Job
    subgraph BuildAndTest [Build & Test Job - Read-Only]
        direction TB
        Checkout1[Checkout Code] --> SetupNode[Setup Node.js v20]
        SetupNode --> InstallDeps[npm ci]
        InstallDeps --> Linter[Run Linter]
        Linter --> TypeCheck[Run Type Check]
        TypeCheck --> Tests[Run Unit Tests]
        Tests --> Build[Run Next.js Build]
    end

    TriggerWorkflow --> BuildAndTest

    %% Write Job
    subgraph ReleaseJob [Release Job - Write Access]
        direction TB
        Checkout2[Checkout Code] --> ReleaseDraft[Generate Release Notes]
        ReleaseDraft --> FinalRelease[Publish GitHub Release]
    end

    %% Dependency
    BuildAndTest -- "Success (Safe)" --> ReleaseJob

    %% Styling
    classDef readOnly fill:#3b82f6,stroke:#1e3a8a,stroke-width:2px,color:#fff;
    classDef writeAccess fill:#ef4444,stroke:#991b1b,stroke-width:2px,color:#fff;

    class Checkout1,SetupNode,InstallDeps,Linter,TypeCheck,Tests,Build readOnly;
    class Checkout2,ReleaseDraft,FinalRelease writeAccess;
```

## 🔒 Security Best Practices

1. **Explicit Permission Scopes**: The global workflow permission is intentionally set to `{}` (none).
2. **Job Isolation**:
   - `build-and-test`: Explicitly granted `contents: read` to access the code.
   - `release`: Explicitly granted `contents: write` to allow the action to publish the generated GitHub Release.
3. **Strict Dependencies**: The `release` job uses `needs: build-and-test`. If any linter, type check, or unit test fails, the workflow immediately aborts, ensuring broken code is never released.

## 🚀 How to Create a Release

To trigger this workflow and publish a new release:

1. Update your `package.json` version.
2. Commit your changes to `main`.
3. Create and push a new tag following semantic versioning (e.g., `v1.0.0`):
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. The GitHub Action will automatically run tests and generate a changelog using `softprops/action-gh-release`.
