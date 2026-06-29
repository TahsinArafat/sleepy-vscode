// sleepy_change - new file
//
// Status bar indicator for Sleepy Code auth state.
// Pattern copied from RemoteStatusService.

import * as vscode from "vscode"

export type AuthState = { loggedIn: boolean; email?: string }

type Listener = (state: AuthState) => void

/**
 * Owns the Sleepy Code auth status bar item.
 * Shows "Sign in to Sleepy Code" when logged out, user email when logged in.
 */
export class SleepyAuthStatusBar implements vscode.Disposable {
  private state: AuthState = { loggedIn: false }
  private bar: vscode.StatusBarItem
  private listeners = new Set<Listener>()

  constructor() {
    this.bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98)
    this.bar.command = "sleepy.login"
    this.sync()
  }

  getState(): AuthState {
    return this.state
  }

  onChange(cb: Listener): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Update state from stored session. */
  updateFromSession(session: { email: string } | null): void {
    this.update(session ? { loggedIn: true, email: session.email } : { loggedIn: false })
  }

  /** Show logged-out state. */
  clearAuth(): void {
    this.update({ loggedIn: false })
  }

  dispose(): void {
    this.listeners.clear()
    this.bar.dispose()
  }

  // -- internal ---------------------------------------------------------------

  private update(next: AuthState): void {
    if (this.state.loggedIn === next.loggedIn && this.state.email === next.email) return
    this.state = next
    this.sync()
    for (const cb of this.listeners) cb(next)
  }

  private sync(): void {
    if (!this.state.loggedIn || !this.state.email) {
      this.bar.text = "$(sign-in) Sleepy Code: Sign In"
      this.bar.tooltip = "Sign in to Sleepy Code"
      this.bar.command = "sleepy.login"
      this.bar.color = new vscode.ThemeColor("editorWarning.foreground")
      this.bar.show()
      return
    }
    this.bar.text = `$(pass-filled) Sleepy Code: ${this.state.email}`
    this.bar.tooltip = `Signed in as ${this.state.email}`
    this.bar.command = "sleepy.logout"
    this.bar.color = new vscode.ThemeColor("testing.iconPassed")
    this.bar.show()
  }
}
