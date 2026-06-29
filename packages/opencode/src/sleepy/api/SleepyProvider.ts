// sleepy_change - new file in Sleepy-owned directory
//
// Sleepy Code custom loader and bundled provider glue.
//
// Sleepy exposes an OpenAI-compatible API at {gatewayUrl}/api/v1/chat/completions
// with Bearer token auth. We use the existing @ai-sdk/openai-compatible SDK rather
// than writing a custom HTTP client.

import { Effect } from "effect"
import { Auth } from "@/auth"
import { SLEEPY_API_URL_DEFAULT, SLEEPY_ACCESS_TOKEN_ENV } from "./constants"

// ---------------------------------------------------------------------------
// Bundled provider — uses @ai-sdk/openai-compatible under the hood
// ---------------------------------------------------------------------------

export const SLEEPY_BUNDLED_PROVIDERS: Record<string, () => Promise<(options: any) => any>> = {
  // We re-use the openai-compatible SDK with Sleepy's base URL + auth header.
  // The options object will be populated by the custom loader below.
  "@sleepy/sleepy-gateway": () =>
    import("@ai-sdk/openai-compatible").then((m) => m.createOpenAICompatible),
}

// ---------------------------------------------------------------------------
// Custom loader — resolves auth token and builds provider options
// ---------------------------------------------------------------------------

type CustomDep = {
  auth: (id: string) => Effect.Effect<Auth.Info | undefined>
  config: () => Effect.Effect<any>
  env: () => Effect.Effect<Record<string, string | undefined>>
  get: (key: string) => Effect.Effect<string | undefined>
}

export function sleepyCustomLoaders(dep: CustomDep): Record<string, (input: any) => Effect.Effect<{
  autoload: boolean
  getModel?: (sdk: any, modelID: string, options?: Record<string, any>) => Promise<any>
  vars?: (options: Record<string, any>) => Record<string, string>
  options?: Record<string, any>
  discoverModels?: () => Promise<Record<string, any>>
}>>
{
  return {
    sleepy: Effect.fnUntraced(function* (_input: any) {
      // 1) Resolve the access token — check env var first, then auth storage, then config
      const envMap = yield* dep.env()
      const config = yield* dep.config()
      const sleepyCfg = config?.provider?.sleepy ?? {}

      const accessToken: string | undefined =
        envMap[SLEEPY_ACCESS_TOKEN_ENV] ??
        sleepyCfg.options?.apiKey

      // If neither env var nor config has a token, try auth storage
      let authToken: string | undefined
      if (!accessToken) {
        const authInfo = yield* dep.auth("sleepy")
        if (authInfo?.type === "api") {
          authToken = authInfo.key
        }
      }

      const resolvedToken = accessToken ?? authToken
      const gatewayUrl = sleepyCfg.options?.baseURL ?? envMap.SLEEPY_API_URL ?? SLEEPY_API_URL_DEFAULT

      return {
        autoload: true,
        options: {
          apiKey: resolvedToken ?? "",
          baseURL: `${gatewayUrl}/api/v1`,
        },

        getModel: async (sdk: any, modelID: string, options?: Record<string, any>) => {
          // Fall back to the language model function on the SDK
          if (sdk.languageModel) return sdk.languageModel(modelID, options)
          if (sdk.chat) return sdk.chat(modelID, options)
          return sdk(modelID, options)
        },

        discoverModels: async () => {
          if (!resolvedToken) return {}
          try {
            const res = await fetch(`${gatewayUrl}/api/models`, {
              headers: { Authorization: `Bearer ${resolvedToken}` },
            })
            if (!res.ok) return {}
            const models = await res.json() as Array<{ modelId: string; name: string; omniRouteModelId: string }>
            const result: Record<string, any> = {}
            for (const m of models) {
              result[m.modelId] = {
                id: m.omniRouteModelId,
                name: m.name,
                provider: { npm: "@sleepy/sleepy-gateway" },
              }
            }
            return result
          } catch {
            return {}
          }
        },
      }
    }),
  }
}
