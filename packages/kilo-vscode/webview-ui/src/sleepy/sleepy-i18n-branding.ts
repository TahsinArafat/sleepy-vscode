// sleepy_change - new Sleepy-owned file
//
// Branding overrides for the i18n system.
// Applied after merging all upstream dictionaries so "Kilo Code" → "Sleepy Code"
// without touching any upstream translation files.
//
// Only the English keys need overriding because every locale falls back to
// the English value when a key is missing in its own dictionary.

export const sleepyBrandingOverrides: Record<string, string> = {
  // -- Kilo Code → Sleepy Code (extension name) --
  "settings.aboutKiloCode.title": "About Sleepy Code",
  "settings.aboutKiloCode.extensionName": "Sleepy Code Extension",
  "deviceAuth.title": "Sign in to Sleepy Code",
  "profile.action.login": "Login with Sleepy Code",
  "migration.whatsNew.title": "What's New in Sleepy Code",

  // Welcome / splash text
  "session.messages.welcome":
    "Sleepy Code is an AI coding assistant. Ask it to build features, fix bugs, or explain your codebase.",

  // Language / UI settings
  "settings.language.description":
    'Choose the language for the Sleepy Code UI. "Auto" uses your VS Code display language.',
  "settings.general.row.language.description":
    "Change the display language for Sleepy Code",

  // Indexing
  "settings.indexing.kiloModel.title": "Sleepy Code model preset",
  "settings.indexing.kiloSignIn.title": "Sleepy Code sign-in required",

  // Migration
  "settings.aboutKiloCode.legacyMigration.title": "Legacy Migration",
  "settings.aboutKiloCode.settingsTransfer.title": "Settings Transfer",

  // Onboarding
  "workStyle.onboarding.welcome": "Welcome to Sleepy Code",

  // Free models tile
  "dialog.model.unpaid.freeModels.title": "Free models provided by Sleepy Code",

  // Anaconda provider (mentions "Kilo" in prose)
  "provider.anaconda.state.notInstalled":
    "Install Anaconda Desktop on this machine, then return here. Sleepy Code does not run the installer for you.",
  "provider.anaconda.state.notRunning":
    "Open Anaconda Desktop, finish setup and sign in, then choose Check again.",
  "provider.anaconda.state.invalidConfig":
    "Anaconda Desktop setup is incomplete. Open Desktop, finish setup, and restart it if needed.",
  "provider.anaconda.state.signedOut":
    "Open Anaconda Desktop and sign in before connecting Sleepy Code.",
  "provider.anaconda.state.unauthorized":
    "Sleepy Code could not access Anaconda Desktop. Open Desktop, sign in again, and restart it if needed.",
  "provider.anaconda.state.ready":
    "Sleepy Code found a healthy local text-generation server and can import its current connection settings.",
  "provider.anaconda.toast.refreshed.description":
    "The active local server and models are up to date in Sleepy Code.",

  // Work style descriptions
  "workStyle.choice.human-in-the-loop.description":
    "Sleepy Code pauses and shows you its plan as it works.",

  // About page — legacy migration description
  "settings.aboutKiloCode.legacyMigration.description":
    "Migrate settings from a previous installation of Kilo Code, including provider API keys and default model.",

  // Desktop app name
  "app.name.desktop": "Sleepy Code Desktop",

  // Sidebar getting started
  "sidebar.gettingStarted.line1":
    "Sleepy Code includes free models so you can start immediately.",

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
}
