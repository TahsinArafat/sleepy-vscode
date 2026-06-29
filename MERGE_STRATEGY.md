# Sleepy Code Fork — Upstream Merge Strategy

We fork [Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode).
Kilo Code itself forks [opencode](https://github.com/anomalyco/opencode).

## Repository

- **Fork**: `TahsinArafat/sleepy-vscode`
- **Upstream**: `Kilo-Org/kilocode` (`git@github.com:Kilo-Org/kilocode.git`)

## File Ownership

| Path | Owner | Merge Behavior |
|------|-------|----------------|
| `packages/opencode/src/sleepy/` | Sleepy | Our code — never touched by upstream |
| `packages/kilo-vscode/src/sleepy/` | Sleepy | Our code — never touched by upstream |
| Everything else | Upstream (Kilo/OpenCode) | Shared — minimize changes, mark with `sleepy_change` |

## Rules

1. **All Sleepy logic lives in `packages/opencode/src/sleepy/`** or `packages/kilo-vscode/src/sleepy/`.
2. **Changes to shared upstream files** must be narrow and marked with `// sleepy_change` start/end comments.
3. **Registration hooks** (config entries, provider registrations, command registrations) are the ONLY acceptable shared-file changes.
4. **No refactoring** of upstream code — make the smallest possible edit.
5. **Never modify** `packages/opencode/src/kilocode/` — that's Kilo's territory. Our parallel `sleepy/` dirs mirror the same pattern Kilo uses for its own code vs upstream opencode.

## `sleepy_change` Markers

When modifying shared upstream files, wrap all changes in:

```typescript
// sleepy_change start — <brief reason>
// ... our changes ...
// sleepy_change end
```

This allows automated scripts to find, preserve, or re-apply our changes during upstream merges.

### Current `sleepy_change` Locations

| File | Lines | Purpose |
|------|-------|---------|
| `packages/opencode/src/provider/provider.ts` | ~15-20, ~149, ~1494 | Import + register Sleepy bundled provider + custom loader |
| `packages/opencode/src/provider/models.ts` | ~10-40 | Register Sleepy Code provider in model catalog |
| `packages/kilo-vscode/src/extension.ts` | ~4-7, ~70-80, ~420-445 | Auth status bar, login/logout commands, env var pass-through |
| `packages/kilo-vscode/src/services/cli-backend/server-manager.ts` | ~147-149 | Forward SLEEPY_ACCESS_TOKEN to CLI backend |
| `packages/kilo-vscode/src/constants.ts` | ~1 | Rename extension to "Sleepy Code" |
| `packages/kilo-vscode/package.json` | ~2-4, ~11-16, ~21-23, ~426-433, ~1067-1072 | Rebrand, add auth commands, add gatewayUrl setting |

## Performing an Upstream Merge

```bash
# Fetch latest Kilo Code
git fetch upstream main

# Create a merge branch
git checkout -b merge-upstream-<date>

# Merge — prefer ours for sleepy/ dirs, theirs for everything else
git merge upstream/main \
  --strategy-option=ours \
  -X theirs

# Verify Sleepy-owned files are untouched
git diff HEAD -- packages/opencode/src/sleepy/ | wc -l
# Should be 0 — if not, revert and re-merge with different strategy

# Check sleepy_change markers survived
grep -r "sleepy_change" packages/opencode/src/ packages/kilo-vscode/src/ packages/kilo-vscode/package.json

# Resolve any conflicts in shared files manually
# Then run full build
bun install && bun run compile
```

## Key Files to Check After Merge

After every upstream merge, verify these files still have our `sleepy_change` blocks intact:

1. `packages/opencode/src/provider/provider.ts` — Sleepy imports + provider spreads
2. `packages/opencode/src/provider/models.ts` — Sleepy provider definition
3. `packages/kilo-vscode/src/extension.ts` — Auth commands + status bar
4. `packages/kilo-vscode/src/services/cli-backend/server-manager.ts` — Token env var
5. `packages/kilo-vscode/package.json` — Commands + settings

If any `sleepy_change` blocks are missing, re-apply them manually.
