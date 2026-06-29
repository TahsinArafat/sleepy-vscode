<p align="center">
  <strong>Sleepy AI</strong> — AI coding agent for VS Code, powered by your Sleepy AI platform.
</p>

<p align="center">
  OAuth login to your Sleepy AI gateway &bull; Model routing via OmniRoute &bull; Virtual key management
</p>

<p align="center">
  Forked from <a href="https://github.com/Kilo-Org/kilocode">Kilo Code</a> — the all-in-one agentic engineering platform.
</p>

## Key Features

- **Code Generation:** Generate code using natural language.
- **Inline Autocomplete:** Intelligent code completions as you type.
- **Task Automation:** Automate repetitive coding tasks.
- **MCP Support:** Use MCP servers to extend agent capabilities.
- **Multi Mode:** Plan with Architect, Code with Coder, Debug with Debugger.

## Sleepy AI Integration

Sleepy AI is a fork of Kilo Code that authenticates against your own Sleepy AI platform instance:

- **OAuth Login** — Sign in with your Sleepy AI account via `Sleepy AI: Sign In` in VS Code
- **OmniRoute Proxy** — All model requests route through Sleepy's intelligent load balancer
- **Virtual Keys** — Authenticate using Sleepy-generated virtual keys with tier-based access
- **Gateway URL** — Configurable gateway endpoint (default: `http://localhost:3000`)

## Get Started

1. Install the Sleepy AI extension from the VSIX file or VS Code Marketplace.
2. Press `Cmd+Shift+P` and run `Sleepy AI: Sign In`.
3. Your browser opens to the Sleepy AI OAuth consent page — approve the request.
4. Start coding! Models are auto-discovered from your Sleepy gateway.

## Commands

| Command | Description |
|---------|-------------|
| `Sleepy AI: Sign In` | Start OAuth login flow |
| `Sleepy AI: Sign Out` | Clear stored credentials |
| `Sleepy AI: Open` | Open the Sleepy AI chat panel |

## Developer Setup

This is a fork of [Kilo Code](https://github.com/Kilo-Org/kilocode) with Sleepy-owned customizations in `src/sleepy/` directories.

```bash
# From the repo root
bun install

# Build the extension
cd packages/kilo-vscode
bun run prepare:cli-binary
node esbuild.js --production
bunx @vscode/vsce package --no-dependencies --skip-license

# Or use the launch script
bun script/launch.ts
```

### Merge Strategy

Sleepy changes to shared files use `sleepy_change` markers for clean upstream merges. See [MERGE_STRATEGY.md](/MERGE_STRATEGY.md).

## License

Apache License 2.0 — same as Kilo Code upstream.
