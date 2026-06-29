// sleepy_change - new file
//
// Sleepy AI OAuth login/logout for the VS Code extension.
//
// Flow:
//   1. Start a local HTTP server on a random port (127.0.0.1 only)
//   2. Open the browser to the Sleepy OAuth consent page with redirect_uri
//      pointing back to the local server
//   3. Sleepy redirects to localhost:PORT/callback?code=...
//   4. Exchange the code for a virtual key via POST /api/auth/oauth/token
//   5. Store the virtual key in VS Code SecretStorage
//   6. Kill the local server

import * as http from "http"
import * as vscode from "vscode"

export interface SleepySession {
  accessToken: string
  email: string
  tier: string
  endpoint: string
}

const CLIENT_ID = "sleepy-vscode"
const GATEWAY_URL_SETTING = "sleepy.gatewayUrl"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Kick off the OAuth login flow.
 *
 * 1. Starts a local HTTP server on 127.0.0.1:0 (random port).
 * 2. Opens the user's default browser to the Sleepy consent page.
 * 3. Waits for the redirect with the auth code.
 * 4. Exchanges the code for a virtual key.
 * 5. Persists the session via `tokenUpdater`.
 *
 * @returns The resolved SleepySession on success.
 */
const OAUTH_TIMEOUT_MS = 120_000

export async function sleepyLogin(
  tokenUpdater: (token: string | null) => Promise<void>,
): Promise<SleepySession> {
  const gatewayUrl = resolveGatewayUrl()

  return new Promise<SleepySession>((resolve, reject) => {
    let listeningPort = 0
    let settled = false

    const done = (fn: (value: any) => void, value: any) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(value)
    }

    const timer = setTimeout(() => {
      server.close()
      done(reject, new Error("OAuth login timed out after 120 seconds"))
    }, OAUTH_TIMEOUT_MS)

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`)

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code")
        const error = url.searchParams.get("error")

        if (error) {
          sendHtmlResponse(res, 400, `Authorization failed: ${error}`)
          server.close()
          done(reject, new Error(error))
          return
        }
        if (!code) {
          sendHtmlResponse(res, 400, "Missing authorization code")
          server.close()
          done(reject, new Error("Missing authorization code"))
          return
        }

        sendHtmlResponse(res, 200, "Authorized! You can close this window and return to VS Code.")
        server.close()

        try {
          const session = await exchangeCode(gatewayUrl, code, `http://127.0.0.1:${listeningPort}/callback`)
          await tokenUpdater(session.accessToken)
          done(resolve, session)
        } catch (err) {
          done(reject, err)
        }
      }
    })

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number }
      listeningPort = addr.port
      const redirectUri = `http://127.0.0.1:${addr.port}/callback`
      // Go through the API authorize endpoint which checks session and redirects to the consent page
      const consentUrl = `${gatewayUrl}/api/auth/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`

      console.log(`[Sleepy] Starting OAuth — opening browser to ${consentUrl}`)
      vscode.window.showInformationMessage("Opening browser for Sleepy AI login...")
      vscode.env.openExternal(vscode.Uri.parse(consentUrl)).then(
        (ok) => {
          if (!ok) {
            server.close()
            done(reject, new Error("Failed to open browser — no handler for protocol"))
          }
        },
        (err: unknown) => {
          server.close()
          done(reject, new Error(`Failed to open browser: ${err instanceof Error ? err.message : String(err)}`))
        },
      )
    })

    server.on("error", (err) => {
      done(reject, new Error(`Auth server error: ${err.message}`))
    })
  })
}

/** Clear persisted token (called on logout). */
export async function sleepyLogout(tokenUpdater: (token: string | null) => Promise<void>): Promise<void> {
  await tokenUpdater(null)
}

/** Read the previously stored session. */
export async function getStoredSession(
  secrets: vscode.SecretStorage,
): Promise<SleepySession | null> {
  const accessToken = await secrets.get("sleepy.accessToken")
  const email = await secrets.get("sleepy.email")
  if (!accessToken) return null
  return {
    accessToken,
    email: email ?? "unknown",
    tier: (await secrets.get("sleepy.tier")) ?? "free",
    endpoint: (await secrets.get("sleepy.endpoint")) ?? resolveGatewayUrl(),
  }
}

/** Store session data in SecretStorage. */
export async function storeSession(
  secrets: vscode.SecretStorage,
  session: SleepySession,
): Promise<void> {
  await secrets.store("sleepy.accessToken", session.accessToken)
  await secrets.store("sleepy.email", session.email)
  await secrets.store("sleepy.tier", session.tier)
  await secrets.store("sleepy.endpoint", session.endpoint)
}

/** Remove session data from SecretStorage. */
export async function clearSession(secrets: vscode.SecretStorage): Promise<void> {
  await secrets.delete("sleepy.accessToken")
  await secrets.delete("sleepy.email")
  await secrets.delete("sleepy.tier")
  await secrets.delete("sleepy.endpoint")
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Resolve the Sleepy gateway URL from VS Code settings or default. */
function resolveGatewayUrl(): string {
  return vscode.workspace
    .getConfiguration()
    .get<string>(GATEWAY_URL_SETTING) ?? "http://localhost:3000"
}

/** Exchange an auth code for a virtual key + session info. */
async function exchangeCode(
  gatewayUrl: string,
  code: string,
  redirectUri: string,
): Promise<SleepySession> {
  const res = await fetch(`${gatewayUrl}/api/auth/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, client_id: CLIENT_ID, redirect_uri: redirectUri }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ?? `Token exchange failed: ${res.status}`,
    )
  }

  const data = (await res.json()) as {
    access_token: string
    email: string
    tier: string
    endpoint: string
  }

  return {
    accessToken: data.access_token,
    email: data.email,
    tier: data.tier,
    endpoint: data.endpoint,
  }
}

/** Write a trivial HTML response. */
function sendHtmlResponse(res: http.ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "Content-Type": "text/html" })
  res.end(`<html><body><p>${body}</p></body></html>`)
}
