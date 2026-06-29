# Disable Cloud Sessions + Replace Kilo Models with Sleepy Models

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two independent changes: (1) disable Cloud sessions and Import sessions features so the UI no longer shows "Cloud" tab or "Import session" buttons, (2) make Sleepy Code's own model list (fetched from Sleepy API `/api/models`) the default instead of Kilo Code's OpenRouter model cache.

**Architecture:**
- **Model list**: Remove the Kilo OpenRouter provider from `packages/opencode/src/provider/models.ts`, make the Sleepy provider always present (not conditional on auth). Change all webview constants from `kilo` → `sleepy` so Sleepy is the gateway/default provider.
- **Cloud sessions**: Strip all webview UI components, context state, message types, and extension-side handlers. Suppress leftover i18n keys via branding overrides rather than editing 20 locale files.

**Tech Stack:** Effect-TS (backend), SolidJS (webview), VS Code extension API

---

### Task 1: Backend models.ts — Remove Kilo provider, make Sleepy provider unconditional

**Files:**
- Modify: `packages/opencode/src/provider/models.ts`
- (No test changes needed — tests are for Kilo features we're removing)

- [ ] **Step 1: Edit models.ts — remove Kilo provider block and `delete providers.kilo`**

In `packages/opencode/src/provider/models.ts`, remove:
1. Line 45: `delete providers.kilo`
2. Lines 75-93: The entire `if (!allowed) ...` block, plus the `if (!allowed) return providers` early return, plus the full kilo provider registration (from `const opts = cfg.provider?.kilo?.options` through `yield* cache.refresh("kilo", ...)`)

The `addApertis()` helper (lines 55-68) stays — it's independent.

The edited `get` function should look like:

```typescript
const get = Effect.fn("ModelsDev.get")(function* () {
  const providers = overlay(yield* core.get())
  const cfg = yield* config.get()

  const addApertis = Effect.fnUntraced(function* () {
    // ... unchanged ...
  })
  yield* addApertis()

  // sleepy_change start — register Sleepy Code provider
  // ...unchanged (sleepy provider registration)...
  // sleepy_change end

  return providers
})
```

Remove the local `disabled`, `enabled`, `allowed` variables and the `KILO_OPENROUTER_BASE` import if no longer used. Remove `const cache = yield* ModelCache.Service` and the `ModelCache` import if apertis doesn't need it (check `addApertis` — `cache.fetch` is called there, so `ModelCache.Service` stays).

Also remove unused imports: `KILO_OPENROUTER_BASE` from `@kilocode/kilo-gateway`.

- [ ] **Step 2: Edit models.ts — remove auth guard on Sleepy provider**

Remove the `if (sleepyToken || cfg.provider?.sleepy?.options?.apiKey)` conditional wrapping the sleepy provider. The sleepy provider should always be registered — even without a token. The model fetch will return `{}` when there's no token (already handled by `Effect.catch(() => Effect.succeed({}))` on the fetch).

Keep the auth token resolution logic:
```typescript
const sleepyInfo = yield* auth.get("sleepy").pipe(Effect.catch(() => Effect.succeed(undefined)))
const sleepyTokenFromAuth = sleepyInfo?.type === "api" ? sleepyInfo.key : undefined
const sleepyToken = sleepyTokenFromAuth ?? process.env.SLEEPY_ACCESS_TOKEN
const sleepyOpts = cfg.provider?.sleepy?.options
const sleepyURL = sleepyOpts?.baseURL ?? process.env.SLEEPY_API_URL ?? "http://localhost:3000"
const token = sleepyToken ?? sleepyOpts?.apiKey
```

These are fine to always resolve — they just yield `undefined` when absent. The model fetch will get `headers: token ? { Authorization: ... } : {}` (already handles empty token gracefully).

- [ ] **Step 3: Verify the edit compiles**

Run: `cd packages/opencode && bun run check-types`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/opencode/src/provider/models.ts
git commit -m "feat: remove Kilo OpenRouter provider, make Sleepy provider unconditional"
```

---

### Task 2: Webview provider constants — change "kilo" → "sleepy"

**Files:**
- Modify: `packages/kilo-vscode/src/shared/provider-model.ts`
- Modify: `packages/kilo-vscode/webview-ui/src/components/shared/model-selector-utils.ts`
- Modify: `packages/kilo-vscode/webview-ui/src/context/provider-utils.ts`
- Modify: `packages/kilo-vscode/src/provider-actions.ts`

- [ ] **Step 1: Update provider-model.ts**

Change:
```typescript
export const KILO_PROVIDER_ID = "kilo"
```
to:
```typescript
export const KILO_PROVIDER_ID = "sleepy"
```

Update `KILO_AUTO`. Currently it's:
```typescript
export const KILO_AUTO = {
  small: { id: "kilo-auto/small", name: "Auto (Small)" },
  efficient: { id: "kilo-auto/efficient", name: "Auto (Efficient)" },
  medium: { id: "kilo-auto/medium", name: "Auto (Medium)" },
  large: { id: "kilo-auto/large", name: "Auto (Large)" },
}
```
Change to:
```typescript
export const KILO_AUTO = {
  small: { id: "sleepy-auto/small", name: "Auto (Small)" },
  efficient: { id: "sleepy-auto/efficient", name: "Auto (Efficient)" },
  medium: { id: "sleepy-auto/medium", name: "Auto (Medium)" },
  large: { id: "sleepy-auto/large", name: "Auto (Large)" },
}
```

Update `PROVIDER_PRIORITY` to reference `KILO_PROVIDER_ID` instead of the literal `"kilo"`:
```typescript
export const PROVIDER_PRIORITY: string[] = [
  KILO_PROVIDER_ID,
  "openai",
  "anthropic",
  // ... rest unchanged
]
```

- [ ] **Step 2: Update model-selector-utils.ts**

Change:
```typescript
export const KILO_GATEWAY_ID = "kilo" as const
```
to:
```typescript
export const KILO_GATEWAY_ID = "sleepy" as const
```

Update `KILO_AUTO_SMALL_IDS` and `KILO_AUTO_EFFICIENT_ID` to use "sleepy" prefix:
```typescript
export const KILO_AUTO_SMALL_IDS = ["sleepy-auto/small"] as const
export const KILO_AUTO_EFFICIENT_ID = "sleepy-auto/efficient"
```

Update `providerSortKey` — it has a `"kilo"` hardcode for the provider sort. Change to `KILO_GATEWAY_ID` or `"sleepy"`:
```typescript
export function providerSortKey(provider: string): number {
  if (provider === KILO_GATEWAY_ID) return 0
  // ... rest unchanged
}
```

- [ ] **Step 3: Update provider-utils.ts**

Change the hardcoded `"kilo"` in `isModelValid()`:
```typescript
export function isModelValid(model: EnrichedModel) {
  // Always valid if it's the default provider
  if (model.providerID === KILO_PROVIDER_ID) return true
  // ... rest unchanged
}
```
Need to import `KILO_PROVIDER_ID` from `../../src/shared/provider-model` (if not already imported). Or if it's easier, just change `"kilo"` → `"sleepy"` directly.

Check the existing import — `provider-utils.ts` likely already references Kilo constants. If not, add import.

- [ ] **Step 4: Update provider-actions.ts**

Update the `KILO_PROVIDER_ID` reference used for auth state (line ~91).

- [ ] **Step 5: Verify compilation**

Run: `cd packages/kilo-vscode && bun run check-types:webview && bun run check-types:extension`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/kilo-vscode/src/shared/provider-model.ts
git add packages/kilo-vscode/webview-ui/src/components/shared/model-selector-utils.ts
git add packages/kilo-vscode/webview-ui/src/context/provider-utils.ts
git add packages/kilo-vscode/src/provider-actions.ts
git commit -m "feat: change webview provider constants from 'kilo' to 'sleepy'"
```

---

### Task 3: Cloud sessions removal (webview UI + context + types)

**Files:**
- Modify: `packages/kilo-vscode/webview-ui/src/components/history/HistoryView.tsx`
- Delete: `packages/kilo-vscode/webview-ui/src/components/history/CloudSessionList.tsx`
- Delete: `packages/kilo-vscode/webview-ui/src/components/chat/CloudImportDialog.tsx`
- Modify: `packages/kilo-vscode/webview-ui/src/context/session.tsx`
- Modify: `packages/kilo-vscode/webview-ui/src/App.tsx`
- Modify: `packages/kilo-vscode/webview-ui/src/types/messages/extension-messages.ts`
- Modify: `packages/kilo-vscode/webview-ui/src/types/messages/webview-messages.ts`
- Modify: `packages/kilo-vscode/webview-ui/src/types/messages/sessions.ts`
- Modify: `packages/kilo-vscode/webview-ui/src/components/chat/PromptInput.tsx`

- [ ] **Step 1: Remove cloud import dialog**

Delete file: `packages/kilo-vscode/webview-ui/src/components/chat/CloudImportDialog.tsx`

- [ ] **Step 2: Remove cloud session list component**

Delete file: `packages/kilo-vscode/webview-ui/src/components/history/CloudSessionList.tsx`

- [ ] **Step 3: Clean up HistoryView.tsx**

Remove:
- The "Cloud" tab button (lines ~98-112 referencing `language.t("session.tab.cloud")`)
- The "Import session" button (lines ~114-116)
- The cloud tab panel rendering (lines ~129-138 with `<CloudSessionList>`)
- Remove `openImport` function
- Remove cloud-related state (the `tab()` signal with "local" | "cloud", simplify to always "local")

The simplified component should just show local sessions with no tabs (or just a single "Local" tab without toggle).

- [ ] **Step 4: Clean up session.tsx context**

Remove all cloud-session-related code from `session.tsx`:
- Remove `cloudPreviewId` signal (line 285)
- Remove `selectCloudSession()` function
- Remove `handleCloudSessionDataLoaded()` (lines 1953-1980)
- Remove `handleCloudSessionImported()` (lines 1982-2053)
- Remove `cloudPreviewId()` checks in `sendMessage()` (lines 2149-2165) and `sendCommand()` (lines 2215-2233) — simplify to non-cloud-aware paths
- Remove `cloud:` prefix filtering in `sessions()` getter (line 2624)
- Remove any `CloudSessionData` type imports

- [ ] **Step 5: Clean up App.tsx**

Remove the `openCloudSession` message handler (lines ~267-271).

- [ ] **Step 6: Clean up message types**

In `extension-messages.ts`:
- Remove `CloudSessionsLoadedMessage` (lines 208-212)
- Remove `CloudSessionDataLoadedMessage` (lines 219-224)
- Remove `CloudSessionImportedMessage` (lines 226-230)
- Remove `CloudSessionImportFailedMessage` (lines 232-236)
- Remove `OpenCloudSessionMessage` (lines 238-241)
- Remove these from the `ExtensionMessage` union

In `webview-messages.ts`:
- Remove `RequestCloudSessionsMessage` (lines 85-90)
- Remove `RequestCloudSessionDataMessage` (lines 96-99)
- Remove `ImportAndSendMessage` (lines 101-114)
- Remove these from the `WebviewMessage` union

In `sessions.ts`:
- Remove `CloudSessionInfo` interface (lines 62-67) if only used by cloud sessions

- [ ] **Step 7: Clean up PromptInput.tsx**

Remove the `cloud:` session handling:
- Remove the session ID lookup skip for `cloud:` sessions (line 161)
- Remove the sandbox controls hide for `cloud:` sessions (line 163)

- [ ] **Step 8: Verify compilation**

Run: `cd packages/kilo-vscode && bun run check-types:webview`
Expected: no type errors.

- [ ] **Step 9: Commit**

```bash
git add packages/kilo-vscode/webview-ui/src/components/history/HistoryView.tsx
git rm packages/kilo-vscode/webview-ui/src/components/history/CloudSessionList.tsx
git rm packages/kilo-vscode/webview-ui/src/components/chat/CloudImportDialog.tsx
git add packages/kilo-vscode/webview-ui/src/context/session.tsx
git add packages/kilo-vscode/webview-ui/src/App.tsx
git add packages/kilo-vscode/webview-ui/src/types/messages/extension-messages.ts
git add packages/kilo-vscode/webview-ui/src/types/messages/webview-messages.ts
git add packages/kilo-vscode/webview-ui/src/types/messages/sessions.ts
git add packages/kilo-vscode/webview-ui/src/components/chat/PromptInput.tsx
git commit -m "feat: remove cloud sessions UI + context + message types from webview"
```

---

### Task 4: Cloud sessions removal (extension host)

**Files:**
- Delete: `packages/kilo-vscode/src/kilo-provider/handlers/cloud-session.ts`
- Modify: `packages/kilo-vscode/src/KiloProvider.ts`
- Modify: `packages/kilo-vscode/src/extension.ts`
- Modify: `packages/kilo-vscode/src/kilo-provider-utils.ts` (remove `mapCloudSessionMessageToWebviewMessage`)

- [ ] **Step 1: Delete cloud-session handler**

Delete file: `packages/kilo-vscode/src/kilo-provider/handlers/cloud-session.ts`

- [ ] **Step 2: Remove cloud session routing from KiloProvider.ts**

Remove:
- Import of cloud session handlers (lines 121-125)
- Message routing entries:
  - `requestCloudSessions` → `handleRequestCloudSessions()` (lines 1244-1245)
  - `requestCloudSessionData` → `handleRequestCloudSessionData()` (lines 1252-1253)
  - `importAndSend` → `handleImportAndSend()` (lines 1255-1271)
- Remove `openCloudSession()` method entirely (line 803-804)
- Remove `cloudSessionCtx` getter (lines 3202-3221)
- Remove any leftover cloud-related fields

- [ ] **Step 3: Remove URI handler from extension.ts**

Remove the deep link handler for `vscode://kilocode.kilo-code/kilocode/s/<id>` (lines 559-564).

- [ ] **Step 4: Remove cloud session message utility from kilo-provider-utils.ts**

Remove `mapCloudSessionMessageToWebviewMessage()` function (line 714).

- [ ] **Step 5: Verify compilation**

Run: `cd packages/kilo-vscode && bun run check-types:extension`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git rm packages/kilo-vscode/src/kilo-provider/handlers/cloud-session.ts
git add packages/kilo-vscode/src/KiloProvider.ts
git add packages/kilo-vscode/src/extension.ts
git add packages/kilo-vscode/src/kilo-provider-utils.ts
git commit -m "feat: remove cloud session handlers from extension host"
```

---

### Task 5: i18n cloud key suppression + build verification

**Files:**
- Modify: `packages/kilo-vscode/webview-ui/src/sleepy/sleepy-i18n-branding.ts`

- [ ] **Step 1: Add cloud session key overrides to branding**

In `sleepy-i18n-branding.ts`, add keys to suppress any remaining cloud translations:

```typescript
// -- Suppress cloud sessions UI (disabled feature) --
"session.tab.local": "Local",
"session.tab.cloud": "",
"session.cloud.repoOnly": "",
"session.cloud.import": "",
"session.cloud.import.title": "",
"session.cloud.import.placeholder": "",
"session.cloud.import.button": "",
"session.cloud.import.invalid": "",
"session.cloud.import.legacy": "",
"session.cloud.import.failed": "",
```

The `"session.tab.local"` override ensures the only visible tab label reads "Local" (since we're removing the "Cloud" tab, but the static text for "Local" should remain).

- [ ] **Step 2: Rebuild all esbuild bundles**

```bash
cd packages/kilo-vscode && node esbuild.js --production
```
Expected: 8 bundles compile, all finish with no errors.

- [ ] **Step 3: Run typechecks on changed packages**

```bash
cd packages/kilo-vscode && bun run check-types:extension && bun run check-types:webview
cd packages/opencode && bun run check-types
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add packages/kilo-vscode/webview-ui/src/sleepy/sleepy-i18n-branding.ts
git commit -m "chore: suppress cloud session i18n keys in branding"
```

---

### Task 6: Rebuild VSIX

- [ ] **Step 1: Rebuild VSIX**

```bash
cd packages/kilo-vscode && bunx @vscode/vsce package --no-dependencies --skip-license -o ./vsix-out/sleepy-code.vsix
```
Expected: VSIX packages successfully.

- [ ] **Step 2: Final commit**

```bash
git add -A && git commit -m "chore: rebuild VSIX with cloud sessions disabled, Sleepy models as default"
```
