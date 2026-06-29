// sleepy_change - new file in Sleepy-owned directory
//
// In-memory session store for the Sleepy AI platform.
// The actual persistent storage lives in VS Code SecretStorage;
// this class is used by the CLI to hold the token in-memory during a session.
// The VS Code extension passes the token to the CLI via env var on spawn.

export interface SleepySession {
  /** The virtual key / access token used to authenticate against the Sleepy API. */
  accessToken: string
  /** Email address of the authenticated user. */
  email: string
  /** Tier label (e.g. "free", "pro", "enterprise"). */
  tier: string
  /** Base URL of the Sleepy gateway (e.g. "http://localhost:3000"). */
  endpoint: string
}

export class SleepyTokenManager {
  private session: SleepySession | null = null

  getSession(): SleepySession | null {
    return this.session
  }

  setSession(session: SleepySession): void {
    this.session = session
  }

  clearSession(): void {
    this.session = null
  }

  isAuthenticated(): boolean {
    return this.session !== null && this.session.accessToken.length > 0
  }

  getAuthHeader(): string | null {
    if (!this.session) return null
    return `Bearer ${this.session.accessToken}`
  }

  getEndpoint(): string {
    return this.session?.endpoint ?? process.env.SLEEPY_API_URL ?? "http://localhost:3000"
  }
}

/** Singleton instance shared across the CLI process. */
export const sleepyTokenManager = new SleepyTokenManager()
